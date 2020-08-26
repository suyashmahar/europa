'use strict'

const { ipcRenderer } = require('electron');
const electron = require('electron');
const fs = require('fs');
const remote = electron.remote;
const dialog = remote.dialog;
const app = remote.app;
const WIN = remote.getCurrentWindow();

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

function startServer(dirPath) {
    
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

function checkInput() {
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
                showMessage('clear');
            }
        });
    } else {
        showMessage('error', `Please enter a path to an existing directory. `);
    }
}

document.getElementById('backBtn').addEventListener('click', (evt) => {
    WIN.webContents.goBack();
})

document.getElementById('cancelBtn').addEventListener('click', (evt) => {
    WIN.close();
})

document.getElementById('submitBtn').addEventListener('click', (evt) => {
    checkInput();
    startServer();
})

document.getElementById('chooseDir').addEventListener('click', (evt) => {
    chooseDir();
})
