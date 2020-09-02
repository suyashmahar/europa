'use strict'

const { ipcRenderer } = require('electron')
const electron = require('electron')

const winDecorations = require('../../js/modules/winDecorations');

const remote = electron.remote;
const app = remote.app;

const InputElement = {
    PY_INTER: 1,
    INIT_DIR: 2,
    PORT_NUM: 3,
}

function updateUI(pythonInterpreterPath) {
    console.log(pythonInterpreterPath);
    document.getElementById('pythonInterpreterPath').value = pythonInterpreterPath;
    document.getElementById('initialPath').value = app.getPath('home');
}

function getAndUpdateJLabCfg() {
    return new Promise(resolve => {
        ipcRenderer.send('get-sys-cfg-jupyter-lab', [])
        ipcRenderer.on('asynchronous-reply', (event, result) => {
            updateUI(result);
        })
    });
}

function focusFieldWithError(fieldId) {
    switch (fieldId) {
        case InputElement.PY_INTER:
            document.getElementById('pythonInterpreterPath').focus();
            break;
        case InputElement.INIT_DIR:
            document.getElementById('initialPath').focus();
            break;
        case InputElement.PORT_NUM:
            document.getElementById('portNum').focus();
            break;
        default:
            console.warn('Unknown value ' + fieldId.toString())
            break;
    }
}

function displayMsg(type, msg) {
    var resultElem = document.getElementById('resultBox');
    if (type == 'error') {
        console.error(msg);
        resultElem.innerHTML = `<a class="text-danger"><i class="fas fa-exclamation-circle"></i> ${msg}</a>`
    } else if (type == 'info') {
        console.info(msg);
        resultElem.innerHTML = `<a class="text-success"><i class="fas fa-info-circle"></i> ${msg}</a>`
    }
}

// 0 = No issue
// [1-] = First field id that is wrong
function checkValues() {
    var result = 0;
    
    // Check the port number
    var portNumStr = document.getElementById('portNum').value;
    var portNum = parseInt(portNumStr);
    
    if ((isNaN(portNum) || portNum > 65535) && portNumStr) {
        console.warn('Cannot parse port number: ' + portNumStr);
        displayMsg('error', `Port number ${portNumStr} is invalid.`);
        result = InputElement.PORT_NUM;
    }
    
    // Check the path to inital directory
    var startAt = document.getElementById('initialPath').value;
    if (!startAt) {
        console.warn('Initial directory not provided')
        displayMsg('error', `Path to initial directory is invalid.`);
        result = InputElement.INIT_DIR;
    }
    
    // Check the path to python interpreter
    var startAt = document.getElementById('pythonInterpreterPath').value;
    if (!startAt) {
        console.warn('Path to python interpreter not provided')
        displayMsg('error', `Path to python interpreter is empty.`);
        result = InputElement.PY_INTER;
    }
    
    return result;
}

function setVisible(selector, visible) {
    document.getElementById(selector).style.display = visible ? 'block' : 'none';
}

function startServer() {
    var retVal = checkValues();
    if (retVal != 0) {
        focusFieldWithError(retVal);
    } else {
        displayMsg('info', '');
        
        var py          = document.getElementById('pythonInterpreterPath').value;
        var startDir    = document.getElementById('initialPath').value;
        var portNum     = document.getElementById('portNum').value;

        if (!portNum) {
            portNum = 'auto'
        }
        
        ipcRenderer.send('start-server', py, startDir, portNum);
        
        // Hide the contents
        setVisible('advanced-config-container', 0);
        setVisible('loadingSpinner', 1);
    }
}

function startServerResp(event, result) {
    console.log(`start-server result: ${result}`);
    setVisible('advanced-config-container', 1);
    setVisible('loadingSpinner', 0);
    
    if (String(result).startsWith('Failed')) {
        displayMsg('error', `${result}`);
    } else {
        displayMsg('info', `Got: ${result}`);
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

function main() {

    ipcRenderer.on('start-server-resp', startServerResp);

    document.getElementById('backBtn').addEventListener('click', (evt) => {
        var window = remote.getCurrentWindow();
        window.webContents.goBack();
    })

    document.getElementById('cancelBtn').addEventListener('click', (evt) => {
        var window = remote.getCurrentWindow();
        window.close();
    })

    document.getElementById('submitBtn').addEventListener('click', (evt) => {
        startServer();
    })

    document.getElementById('refillBtn').addEventListener('click', (evt) => {
        getAndUpdateJLabCfg();
    })

    winDecorations.setupDecorations();
}

main();