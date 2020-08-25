#!/usr/bin/env pwsh
# @file start_jupyter_lab.ps1
# @brief Script to start jupyter lab
# Usage: 
#     .\start_jupyter_lab.ps1 -py <Path to python interpreter> -startAt <start-dir> -port {<port>|auto}
# @author Suyash Mahar

# Read parameters
param(
    [Parameter(Mandatory)]
    [string]$py,

    [Parameter(Mandatory)]
    [string]$startAt,
    
    [Parameter(Mandatory)]
    [string]$portNum
)

# Parses the tempFile to get the server's URL
function Get-ServerURL($tempFile) {
    Get-Content "$tempFile" `
        | Select-String -Pattern '(http|https)://.*$' -All `
        | ForEach-Object { $_.Matches } `
        | ForEach-Object { $_.Value } `
        | Select-Object -Last 1
}

# If the jupyter server was not started, this function writes 'Failed' to 
# stdout. This output is expected to be read by the caller Electron process
# to notify the user
function Ping-Failure() {
    Write-Host 'Failed'
}

# Writes the URL of the server to the stdout on success, this URL is then read
# from the electron process
function Ping-Success($serverURL) {
    Write-Host "${serverURL}"
}

# Check the output of the process
function Watch-Server($job, $tempFile) {
    if (!$job) {
        Ping-Failure
        return
    }

    $serverURL = $null

    # Check if we have found something yet
    while (($serverURL -eq "") -or ($null -eq $serverURL)) {

        # Check if the process is still running
        if ($job.HasExited) {
            Ping-Failure
            return
        }

        $serverURL = Get-ServerURL $tempfile
        Start-Sleep 0.5
    }

    Ping-Success "$serverURL"
    return
}

# Create a string for the port number
$portStr = ""
if ($portNum -ne "auto") {
    $portStr = "--port=${portNum}"
}

# Create a new temporary file to write output of the process to
$tempFile = New-TemporaryFile

# Start jupyter lab
$job = Start-Process powershell `
    -NoNewWindow `
    -Argumentlist `
        "${py}", `
        "-m jupyterlab ${portStr} --no-browser --notebook-dir=${startAt} > $tempFile 2>&1"`
    -PassThru

# Watch the status of the server and notify electron
Watch-Server $job $tempFile
