const { shell, ipcRenderer, remote } = require('electron');

const winDecorations = require('../../js/modules/winDecorations');

var callbackName = undefined;
var dialogId = undefined;
var window = remote.getCurrentWindow();

const ICON_HTML_MAP = {
    'info': `<i class="fas fa-info-circle text-primary"></i>`,
    'question': `<i class="fas fa-question-circle text-primary"></i>`,
    'warning': `<i class="fas fa-exclamation-triangle text-danger"></i>`,
    'error': `<i class="fas fa-times-circle text-danger"></i>`,
};

function setupUI(properties) {
    var titleStr, primaryBtnStr, secondaryBtnStr, iconHTML, content;

    if ('title' in properties) {
        titleStr = properties['title']
    } else {
        titleStr = 'Dialog Box';
    }
    
    if ('primaryBtn' in properties) {
        primaryBtnStr = properties['primaryBtn']
    } else {
        primaryBtnStr = 'OK';
    }
    
    if ('secondaryBtn' in properties) {
        secondaryBtnStr = properties['secondaryBtn']
    } else {
        secondaryBtnStr = 'Cancel';
    }
    
    if ('type' in properties) {
        iconHTML = ICON_HTML_MAP[properties['type']]
    } else {
        iconHTML = ICON_HTML_MAP['info'];
    }

    if ('content' in properties) {
        content = properties['content'];
    } else {
        content = 'Dialog box content.'
    }
    
    document.getElementById('btnPrimary').innerHTML = primaryBtnStr;
    document.getElementById('btnSecondary').innerHTML = secondaryBtnStr;
    document.getElementById('msgIcon').innerHTML = iconHTML;
    document.getElementById('msgBox').innerHTML = content;
    remote.getCurrentWindow().setTitle(titleStr);
}

function main() {
    document.getElementById('btnPrimary').addEventListener('click', (evt) => {
        ipcRenderer.send('dialog-result', dialogId, 'primary');
        window.close();
    })

    document.getElementById('btnSecondary').addEventListener('click', (evt) => {
        ipcRenderer.send('dialog-result', dialogId, 'primary');
        window.close();
    })

    /**
     * @brief Sets up the dialog box
     * @param properties Dictionary containing the dialog properties
     *          title           Title of the window
     *          content         Content of the message box
     *          primaryBtn      Text of the primary button
     *          secvondaryBtn   Text of the primary button
     *          type            {'info'|'question'|'warning'|'error'}
     *          callbackName    Name to call on ipcMain on user input
     */
    ipcRenderer.on('construct', (event, properties, callbackName) => {
        console.log(`Got: ${JSON.stringify(properties)}, ${callbackName}`);
        dialogId = callbackName;
        resultCallback = callbackName;
        setupUI(properties);
    })

    winDecorations.setupDecorations();
}

main();