'use strict'

const { ipcRenderer } = require('electron')
const electron = require('electron')
const path = require('path')
const remote = electron.remote

document.getElementById('close-btn').addEventListener('click', (evt) => {
  var window = remote.getCurrentWindow();
  window.close();
})
