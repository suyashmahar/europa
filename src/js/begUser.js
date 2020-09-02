'use strict'

const { ipcRenderer } = require('electron');
const electron = require('electron');
const fs = require('fs');
const remote = electron.remote;
const dialog = remote.dialog;
const app = remote.app;
const WIN = remote.getCurrentWindow();

const winDecorations = require('../../js/modules/winDecorations');

function showMessage(msgType, msg="") {
    var elem = document.getElementById('begInfoBox');
    if (msgType === 'error') {
        elem.innerHTML = `<a class="text-danger"><i class="fas fa-exclamation-circle"></i> ${msg}</a>`;
    } else if (msgType === 'success') {
        elem.innerHTML = `<a class="text-success"><i class="fas fa-exclamation-circle"></i> ${msg}</a>`;
    } else if (msgType === 'clear') {
        elem.innerHTML = '';
    } else {
        console.error(`Unknown msgType: ${msgType} for msg: ${msg}.`);
    }
}

function setVisible(selector, visible) {
    document.getElementById(selector).style.display = visible ? 'block' : 'none';
}

function startServer(dirPath) {
    checkInput(() => {
        showMessage('clear', '');
        
        var py          = "python";
        var startDir    = dirPath;
        var portNum     = 'auto';

        ipcRenderer.send('start-server', py, startDir, portNum);
        
        // Hide the contents
        setVisible('beg-config-container', 0);
        setVisible('loadingSpinner', 1);
    });
}

function startServerResp(event, result) {
    console.log(`start-server result: ${result}`);
    setVisible('beg-config-container', 1);
    setVisible('loadingSpinner', 0);
    
    if (String(result).startsWith('Failed')) {
        showMessage('error', `${result}`);
    } else {
        showMessage('info', `Got: ${result}`);
        var url = String(result)
        
        // trim white spaces
        url = url.replace(/(^[ '\^\$\*#&]+)|([ '\^\$\*#&]+$)/g, '')
        
        if (url) {
            ipcRenderer.send('open-url', url);
            var window = remote.getCurrentWindow();
            window.close();
        }
    }
}

function chooseDir() {
    let options = {
        title : "Choose JupyterLab's start directory", 
        defaultPath : app.getPath('home'),
        buttonLabel : "Start here",
        properties: ['openDirectory']
    }
    
    var dir = dialog.showOpenDialog(options);
    chooseDirResp(dir);
}

function chooseDirResp(dirPath) {
    if (dirPath != undefined) {
        console.log(`Directory: ${dirPath}`)
        document.getElementById('startDir').value = dirPath;
    }
}

function checkInput(callback) {
    var dirPath = document.getElementById('startDir').value;

    if (dirPath) {
        fs.stat(dirPath, function (err, stats){
            if (err) {
                console.log(`Directory doesn't exist ${dirPath}`);
                showMessage('error', `Path does not point to any valid location.`);
            }
            if (!stats.isDirectory()) {
                console.log(`Path is not a directory: ${dirPath}`);
                showMessage('error', `Path is not a directory.`);
            } else {
                console.log(`${dirPath} exists as a directory.`);
                callback();
                showMessage('clear');
            }
        });
    } else {
        showMessage('error', `Please enter a path to an existing directory. `);
    }
}

function main() {
    document.getElementById('backBtn').addEventListener('click', (evt) => {
        WIN.webContents.goBack();
    })

    document.getElementById('cancelBtn').addEventListener('click', (evt) => {
        WIN.close();
    })

    document.getElementById('submitBtn').addEventListener('click', (evt) => {
        startServer(document.getElementById('startDir').value);
    })

    document.getElementById('chooseDir').addEventListener('click', (evt) => {
        chooseDir();
    })
    
    winDecorations.setupDecorations();

    ipcRenderer.on('start-server-resp', startServerResp);
}

main();