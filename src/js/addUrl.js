'use strict'

const { ipcRenderer } = require('electron')
const electron = require('electron')
const path = require('path')
const remote = electron.remote

function main() {
  document.getElementById('submit-btn').addEventListener('click', (evt) => {
    // prevent default refresh functionality of forms
    evt.preventDefault();

    const input = document.getElementById('add-input');

    if (input.value != '') {
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


  var window = remote.getCurrentWindow();
  window.webContents.once('did-finish-load', () => {
    const contentSize = window.getContentSize();
    const windowSize = window.getSize();
    const mainContainer =document.getElementById('htmlTag');
    const newHeight = mainContainer.offsetHeight+2;
    console.log(contentSize)
    console.log(newHeight)
    window.setSize(
        windowSize[0], 
        newHeight+(windowSize[1]-contentSize[1])
    );
  })
}

main();