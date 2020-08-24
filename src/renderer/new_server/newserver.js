'use strict'

const { ipcRenderer } = require('electron')
const electron = require('electron')
const path = require('path')
const url = require('url')
const remote = electron.remote

document.getElementById('advancedUser').addEventListener('click', (evt) => {
  var filePath = path.join('renderer', 'new_server', 'advanceduser.html');
  console.log(filePath);
  remote.getCurrentWindow().loadFile(filePath);
})
