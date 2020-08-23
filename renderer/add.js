'use strict'

const { ipcRenderer } = require('electron')
const electron = require('electron')
const path = require('path')
const remote = electron.remote

document.getElementById('submit-btn').addEventListener('click', (evt) => {
  // prevent default refresh functionality of forms
  evt.preventDefault()

  const input = document.getElementById('add-input')
  
  ipcRenderer.send('add-todo', input.value)

  input.value = ''

  // Close the window
  var window = remote.getCurrentWindow();
  window.close();
})

document.getElementById('cancel-btn').addEventListener('click', (evt) => {
  var window = remote.getCurrentWindow();
  window.close();
})
