'use strict'

const { ipcRenderer, remote, shell } = require('electron')

/* How long to show the badge for */
const STATUS_BADGE_TMOUT = 3000;

/* When to hide the status badge */
var statusBadgeHideAt = undefined;

function updateStatus(status) {
    if (status == 'success') {
        document.getElementById('statusBadge').style.display = 'block';
        document.getElementById('headerTxt').innerHTML = `Settings <span class="badge badge-success" id="statusBadge">saved</span>`
    } else if (status == 'failure') {
        document.getElementById('statusBadge').style.display = 'block';
        document.getElementById('headerTxt').innerHTML = `Settings <span class="badge badge-danger" id="statusBadge">failed</span>`
    } else {
        document.getElementById('statusBadge').style.display = 'block';
        document.getElementById('headerTxt').innerHTML = `Settings <span class="badge badge-primary" id="statusBadge">${status}</span>`
    }

    statusBadgeHideAt = Date.now() + STATUS_BADGE_TMOUT;

    setTimeout(() => {
        console.log(statusBadgeHideAt);
        console.log(Date.now());
        if (statusBadgeHideAt) {
            /* If the status hide time has not been updated (cur time is within 100 ms) */
            if (statusBadgeHideAt - Date.now() < 100) {
                document.getElementById('statusBadge').style.display = 'none';
            }
        }
    }, STATUS_BADGE_TMOUT);
}

function saveSettings() {
    var settingsObj = {};
    settingsObj["show-keyboard-shortcuts-dialog"] = undefined;

    if (document.getElementById('kbdShortcutsDlgAsk').checked) {
        settingsObj["show-keyboard-shortcuts-dialog"] = "ask";
    } else if (document.getElementById('kbdShortcutsDlgNeverAsk').checked) {
        settingsObj["show-keyboard-shortcuts-dialog"] = "never";
    }

    ipcRenderer.send('save-settings', settingsObj);
    updateStatus('success');
}

function updateUI(settingsObj) {
    if (settingsObj["show-keyboard-shortcuts-dialog"] == "ask") {
        document.getElementById('kbdShortcutsDlgAsk').true;
    } else if (settingsObj["show-keyboard-shortcuts-dialog"] == "never") {
        document.getElementById('kbdShortcutsDlgNeverAsk').checked = true;
    }
}

function main() {
    document.getElementById('saveBtn').addEventListener('click', () => {
      saveSettings();
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      remote.getCurrentWindow().close();
    });

    document.getElementById('clearCache').addEventListener('click', () => {
        updateStatus('cache cleared');
        ipcRenderer.send('clear-cache');
    });

    ipcRenderer.on('settings-value', (event, settingsObj) => {
        updateUI(settingsObj);
    });
    
    
}

main();