'use strict'

const { BrowserWindow } = require('electron');

// default window settings
const defaultProps = {
  width: 1080,
  height: 768,
  show: false,
  
  // update for electron V5+
  webPreferences: {
    nodeIntegration: true
  }
}

class Window extends BrowserWindow {
  constructor ({ file, ...windowSettings }) {
    super({ ...defaultProps, ...windowSettings })

    this.loadFile(file)

    this.once('ready-to-show', () => {
      this.show()
    })
  }
}

module.exports = Window
