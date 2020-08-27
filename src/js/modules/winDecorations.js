const os = require('os');
const customTitlebar = require('custom-electron-titlebar');
 
module.exports.setupDecorations = function () {
  if (os.platform != 'linux') {
    new customTitlebar.Titlebar({
        backgroundColor: customTitlebar.Color.fromHex('#444')
    });
  }
}
