#!/usr/bin/env sh

# @file start_jupyter_lab.sh
# @brief Script to start jupyter lab on Linux
# Usage: 
#     ./start_jupyter_lab.sh <Path to python interpreter> <start-dir> {<port>|auto}
# @author Suyash Mahar

# Run on a successful retrieval of the url
pingSuccess() {
    local url="$1"

    echo "$url"
    exit 0
}

# Run if the jupyter server fails to start
pingFailure() {
    local msg="$1"
    local tempFile="$2"

    echo "Failed: ${msg}. Log at: ${tempFile}"
    exit 1
}

# Parse the input arguments to the script
parseArgs() {
    py="$1"
    startAt="$2"
    portNum="$3"

    if [ "$#" != 3 ]; then
        pingFailure "Wrong number of arguments, check docs." "$tempFile"
    fi
}

watchServer() {
    local pid="$1"
    local tempFile="$2"

    while true; do
        # Check if the process is still alive 
        if ! kill -0 "$pid" > /dev/null 2>&1; then
            pingFailure "Command killed" "$tempFile"
        fi

        # Check if the tempFile has the url yet
        local url=$(cat "$tempFile" | grep -Eo '(http|https)://.*$' |  tail -n1)

        if [ "$url" != "" ]; then
            pingSuccess "$url"
        fi

        sleep 1
    done
}

main() {
    parseArgs "$@"

    local tempFile="$(mktemp)"

    local portStr=""
    if [ "$portNum" != 'auto' ]; then
        portStr="--port=${portNum}"
    fi

    nohup "${py}"\
        -m jupyterlab \
        "${portStr}" \
        "--notebook-dir=${startAt}" \
        --no-browser > "${tempFile}" 2>&1 &

    watchServer "$!" "$tempFile"
}

main "$@"
