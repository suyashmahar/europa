'use strict'

const { ipcRenderer } = require('electron')
const electron = require('electron')
const path = require('path')
const remote = electron.remote

document.getElementById('submit-btn').addEventListener('click', (evt) => {
  // prevent default refresh functionality of forms
  evt.preventDefault();

  const input = document.getElementById('add-input');

  if (input.value != '') {
    ipcRenderer.send('add-recent-url', input.value);

    ipcRenderer.send('open-url', input.value);
    
    // Close the window
    var window = remote.getCurrentWindow();
    window.close();
  } else {
    const input = document.getElementById('add-input');
    input.focus();
  }
})

document.getElementById('cancel-btn').addEventListener('click', (evt) => {
  var window = remote.getCurrentWindow();
  window.close();
})
