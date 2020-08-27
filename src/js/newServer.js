'use strict'

const { ipcRenderer } = require('electron')
const electron = require('electron')
const path = require('path')
const url = require('url')
const remote = electron.remote

const winDecorations = require('../../js/modules/winDecorations');

function main() {
  document.getElementById('advancedUser').addEventListener('click', (evt) => {
    var filePath = path.join('renderer', 'new_server', 'advanceduser.html');
    remote.getCurrentWindow().loadFile(filePath);
  });

  document.getElementById('beginnerUser').addEventListener('click', (evt) => {
    var filePath = path.join('renderer', 'new_server', 'beginneruser.html');
    remote.getCurrentWindow().loadFile(filePath);
  });

  winDecorations.setupDecorations();
}

main();