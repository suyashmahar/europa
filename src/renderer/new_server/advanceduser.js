'use strict'

const { ipcRenderer } = require('electron')
const electron = require('electron')
const remote = electron.remote;
const app = remote.app;

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
        case 1:
            document.getElementById('pythonInterpreterPath').focus();
            break;
        case 2:
            document.getElementById('initialPath').focus();
            break;
        case 2:
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
        resultElem.innerHTML = `<a class="text-warning"><i class="fas fa-exclamation-circle"></i> ${msg}</a>`
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

    if (isNaN(portNum) || portNum > 65535) {
        console.warn('Cannot parse port number: ' + portNumStr);
        displayMsg('error', `Port number ${portNumStr} is invalid.`);
        result = 3;
    } else {
        console.log('using port ' + portNumStr + ' ' + portNum.toString());
    }

    return result;
}

function setVisible(selector, visible) {
    // console.log(document.getElementById(selector).style.display)
    document.getElementById(selector).style.display = visible ? 'block' : 'none';
}

function startServer() {
    var retVal = checkValues();
    if (retVal != 0) {
        focusFieldWithError(retVal);
    } else {
        displayMsg('info', 'Everything looks good');
    }
    
    var py          = document.getElementById('pythonInterpreterPath').value;
    var startDir    = document.getElementById('initialPath').value;
    var portNum     = document.getElementById('portNum').value;

    ipcRenderer.send('start-server', py, startDir, portNum);

    // Hide the contents
    setVisible('advanced-config-container', 0);
    setVisible('loadingSpinner', 1);
}

function startServerResp(event, result) {
    console.log(`start-server result: ${result}`);
    setVisible('advanced-config-container', 1);
    setVisible('loadingSpinner', 0);
    displayMsg('info', `Got: ${result}`);

    if (result != 'Failed') {
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