'use strict'

const path = require('path')
const request = require('request')
const { app, electron, ipcMain, BrowserWindow, session, dialog } = require('electron')
const fs = require('fs');
const os = require('os');

const Window = require('./Window')
const DataStore = require('./DataStore')
const electronLocalshortcut = require('electron-localshortcut');
const commandExists = require('command-exists');
const https = require('https')
const { execSync } = require('child_process')
const { spawn } = require('child_process');
const { url } = require('inspector');
const { create } = require('domain');

require('electron-reload')(process.cwd())

const EUROPA_HELP_SHORTCUTS_LINK = 'https://github.com/suyashmahar/europa/wiki/Keyboard-shortcuts';
const EUROPA_UNSUPPORTED_JUPYTER_LINK = 'https://github.com/suyashmahar/europa/wiki/unsupportedjupyter';

const MAX_RECENT_ITEMS = 4;
const SHORTCUT_SEND_URL = `/lab/api/settings/@jupyterlab/shortcuts-extension:plugin?1598459201550`;
const DRAW_FRAME = (os.platform !== 'linux');

// create a new todo store name "Todos Main"
const todosData = new DataStore({ name: 'Todos Main' });
var iconPath;
var mainWindow;

// Tracks all the url opened so far
var urlsOpened = []; 
var JUPYTER_REQ_FILTER = {
  urls: ['*']
}

// url filter to see if the login was successful 
var JUPYTER_LOGIN_SUCCESS_FILTER = {
  urls: ['*://*/*api/contents/*']
}

// Tracks login for a host
var loginTracker = {}
// Tracks window for a url
var windowTracker = {}
// Tracks the dialog box responses
var dialogRespTracker = {}
// Tracks jupyter format cookie for urls
var jupyterCookieTracker = {}

function getPythonInterpreter() {
  var result = undefined;
  var found = commandExists.sync('python3') 
                || commandExists.sync('python');
  if (found) {
    result = execSync(`python -c "import sys; print(sys.executable)"`)
  }

  console.log('Returning: '.concat(result));
  return result;
}

// Monitor the started child process for starting jupyter lab server
function monitorStartServerChild(event, child) {
  child.stdout.on("data", function(data) {
    if (data) {
      event.sender.send('start-server-resp', data);
    }
    console.log("Shell Data: " + data);
  });
  child.stderr.on("data", function(data){
    if (data) {
      event.sender.send('start-server-resp', data);
    }
    console.log("Shell Errors: " + data);
  });

  console.log(`Child.killed = ${child.killed}`)
}

function startServerWindows(event, py, startAt, portNum) {
  var cwd = process.cwd();
  var scriptPath = path.join(cwd, 'scripts', 
    'windows', 'start_jupyter_lab.ps1');
    
    // Execute the command async
    var child = spawn("powershell.exe", [scriptPath, `${py} ${startAt} ${portNum}`]);
    monitorStartServerChild(event, child);
}

function startServerLinux(event, py, startAt, portNum) {
  var cwd = process.cwd();
  var scriptPath = path.join(cwd, 'scripts', 
    'linux', 'start_jupyter_lab.sh');
    
    // Execute the command async
    var child = spawn("sh", [scriptPath, py, startAt, portNum]);
    console.log(`Running: sh ${scriptPath} ${py} ${startAt} ${portNum}`)
    monitorStartServerChild(event, child);
}

// Runs OS specific script to start a jupyter lab server
function startServerOS(event, py, startAt, portNum) {
  if (process.platform === "win32") {
    startServerWindows(event, py, startAt, portNum);
  } else if (process.platform === "linux") {
    startServerLinux(event, py, startAt, portNum);  
  } else {
    console.error("Unsupported platform " + process.platform);
  }
}

function setupIcons() {
  if (os.platform() === 'win32') {
    iconPath = path.join(__dirname, 'assets', 'img', 'europa_logo.ico');
  } else if (os.platform() == 'linux') {
    iconPath = path.join(__dirname, 'assets', 'img', 'europa_logo.png');
  } else if (os.platform() === 'darwin') {
    iconPath = path.join(__dirname, 'assets', 'img', 'europa_logo.icns');
  } else {
    console.warn(`Platform ${os.platform()} has not icon set.`)
  }
}

/**
 * @brief Check if the shortcuts needs to be set (before asking user)
 * Generate a GET request on the keyboard settings URL and compare the response
 */
function shouldSetShortcuts(urlObj, callback) {
  var reqUrl = `${urlObj.origin}/lab/api/settings/@jupyterlab/shortcuts-extension:shortcuts?${Date.now()}`;
  console.log(reqUrl)
  request.get(
    {
      url : reqUrl,
      headers: {
        'Host': urlObj.host,
        'Origin': urlObj.origin,
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'cookie': jupyterCookieTracker[urlObj.origin]['cookie'],
        'X-XSRFToken': jupyterCookieTracker[urlObj.origin]['xsrf'],
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36' 
      }
    },
    function (error, response, body) {
      // console.log(error)
      // console.log(response)
      var result = false;
      if (!error) {
        var rcvData = JSON.parse(body);
        if (rcvData['raw']) {
          if (rcvData['raw'].length == 2) {
            result = true;
          }
        } else {
          // Show warning for an old version of jupyter lab
          const props = {
            'type': 'warning',
            'title': 'Unsupported JupyterLab version',
            'content': `<p>Unsupported version of JupyterLab.</p><p class="text-secondary">Some of the Europa's functionality will be disabled (e.g., automatic shortcut configuration). <a onClick="shell.openExternal('${EUROPA_UNSUPPORTED_JUPYTER_LINK}'); return false;" href="javascript:void">Know More.</a></p>`,
            'primaryBtn': 'OK',
            'secondaryBtn': '',
          }
          createDialog(windowTracker[urlObj.origin], props, `${Date.now()}`, (resp) => {});
        }
      }
      callback(result);
    }); 
}

function askUserForShortcuts(url, window) {
  var props = {
    'type': 'question',
    'title': 'Set shorcuts?',
    'primaryBtn': 'Yes',
    'secondaryBtn': 'No',
    'content': `<p>Set JupyterLab shortcuts for Europa?</p><p class="text-secondary">E.g., Alt+Tab to switch tabs. Note that these changes are persistent. <a onClick="shell.openExternal('${EUROPA_HELP_SHORTCUTS_LINK}'); return false;" href="javascript:void">Know More</a></p>`
  }

  var id = url+'_ask_shortcuts';
  createDialog(window, props, id, (resp) => { 
    if (resp == 'primary') {
      sendShortcuts(id);
    }
  });
}

/**
 * Sends a PUT request for the custom shortcut to link in the id
 * @param {string} id url + tag
 */
function sendShortcuts(id) {
  var url = id.replace(/_ask_shortcuts/, '');
  var urlObj = new URL(url);

  const jsonData = fs.readFileSync(path.join('config', 'jupyter_keyboard_shortcuts.json'));
  request.put(   
  {
    url : `${urlObj.origin}/lab/api/settings/@jupyterlab/shortcuts-extension:shortcuts?${Date.now()}`,
    headers: {
      'Host': urlObj.host,
      'Origin': urlObj.origin,
      'Connection': 'keep-alive',
      'Content-Type': 'text/plain',
      'Content-Length': jsonData.length,
      'cookie': jupyterCookieTracker[urlObj.origin]['cookie'],
      'X-XSRFToken': jupyterCookieTracker[urlObj.origin]['xsrf'],
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36' 
    },
    body: jsonData
  },
  function (error, response, body) {
    if (!error) {
      windowTracker[urlObj.origin].reload();
    }
  }); 
}

/**
 * Creates a dialog box
 * @param {BrowserWindow} window 
 * @param {dictionary} props Properties of the dialog box, check dialogbox.js
 * @param {string} id unique identifier for this dialog box
 */
function createDialog(window, props, id, callback) {
  var dialogBox = new Window({
    file: path.join('renderer', 'dialog_box', 'dialogbox.html'),
    width: 500,
    height: 230,
    icon: iconPath,
    frame: DRAW_FRAME,
    useContentSize: true,
    // close with the main window
    parent: window
  })

  // dialogBox.setMenu(null)
  // dialogBox.setAutoHideMenuBar(true)


  dialogBox.webContents.on('did-finish-load', () => {
    dialogBox.webContents.send('construct', props, id);
  });
  
  dialogRespTracker[id] = callback;
}

function startHTTPProxy() {
  const webRequest = session.defaultSession.webRequest
  webRequest.onBeforeSendHeaders(JUPYTER_REQ_FILTER, 
      (details, callback) => {
      if (details.uploadData) {
        const buffer = Array.from(details.uploadData)[0].bytes;
      }
      callback(details);
  });

  webRequest.onHeadersReceived(JUPYTER_LOGIN_SUCCESS_FILTER, 
    (details, callback) => {
      if (details) {
        var urlObj = new URL(details.url);
        if (!(urlObj.origin in loginTracker)) {
          loginTracker[urlObj.origin] = true;

          getCookies(details.url, () => {
            shouldSetShortcuts(urlObj, (result) => {
              if (result) {
                askUserForShortcuts(details.url, windowTracker[urlObj.origin]);
              }
            });
          })
        }
      }
      callback(details);
  });
}

function getCookies(urlRequested, callback) {
  const urlObj = new URL(urlRequested);
  var domain = urlObj.hostname;

  const result = 
    session.defaultSession.cookies.get(
      {domain}, 
      (error, result) => {
        var key = urlObj.origin;
        
        /* Generate cookie in JupyterLab's format */
        jupyterCookieTracker[key] = {'cookie': undefined, 'xsrf': undefined};
        jupyterCookieTracker[key]['cookie'] = result[0]['name'];
        jupyterCookieTracker[key]['cookie'] += '=';
        jupyterCookieTracker[key]['cookie'] += result[0]['value'];
        jupyterCookieTracker[key]['cookie'] += '; ';
        jupyterCookieTracker[key]['cookie'] += result[1]['name'];
        jupyterCookieTracker[key]['cookie'] += '=';
        jupyterCookieTracker[key]['cookie'] += result[1]['value'];

        // console.log(`Cookie generated: ${jupyterCookieTracker[key]['cookie']}`);

        jupyterCookieTracker[key]['xsrf'] = result[0]['value'];

        // console.log(`XSRF generated: ${jupyterCookieTracker[key]['xsrf']}`);

        callback();
      }
    )

  return result;
}

function addTrackingForUrl(url) {
  console.log('Starting tracking for ' + url);
}

function removeTrackingForUrl(url) {
  console.log('Removing tracking for ' + url);
  const urlObj = new URL(url);
  if (urlObj.origin in loginTracker) {
    delete loginTracker[urlObj.origin];
  }
}

function main () {
  setupIcons();
  startHTTPProxy();
  
  mainWindow = new Window({
    file: path.join('renderer', 'welcome.html'),
    titleBarStyle: "hidden",
    icon: iconPath,
    frame: DRAW_FRAME,
  })
  
  // Hide menu bars
  // mainWindow.setMenu(null)
  // mainWindow.setAutoHideMenuBar(true)

  // add todo window
  let addTodoWin
  let newServerDialog

  // TODO: put these events into their own file

  // initialize with todos
  mainWindow.once('show', () => {
    mainWindow.webContents.send('todos', todosData.todos)
  })

  ipcMain.on('get-sys-cfg-jupyter-lab', (event) => {
    var resp = (
      getPythonInterpreter()
    );
    event.sender.send('asynchronous-reply', resp);
  });

  ipcMain.on('start-server', (event, py, startAt, portNum) => {
    startServerOS(event, py, startAt, portNum)
  });

  // create add todo window
  ipcMain.on('open-url-window', () => {
    // if addTodoWin does not already exist
    if (!addTodoWin) {
      // create a new add todo window
      addTodoWin = new Window({
        file: path.join('renderer', 'add_url', 'add_url.html'),
        width: 500,
        height: 120,
        icon: iconPath,
        frame: DRAW_FRAME,

        // close with the main window
        parent: mainWindow
      })
     
      // Disable menu bar
      addTodoWin.setMenu(null)
      addTodoWin.setAutoHideMenuBar(true)
      
      // cleanup
      addTodoWin.on('closed', () => {
        addTodoWin = null
      })
      addTodoWin.once('ready-to-show', () => {
      })
    }
  })

  // create add todo window
  ipcMain.on('new-server-window', () => {
    if (!newServerDialog) {
      newServerDialog = new Window({
        file: path.join('renderer', 'new_server', 'newserver.html'),
        width: 600,
        height: 450,
        maxWidth: 600,
        maxHeight: 450,
        minWidth: 600,
        minHeight: 450,
        // close with the main window
        parent: mainWindow,
        icon: iconPath,
        frame: DRAW_FRAME,
      })

      // Disable menu bar
      newServerDialog.setMenu(null)
      newServerDialog.setAutoHideMenuBar(true)

      // cleanup
      newServerDialog.on('closed', () => {
        newServerDialog = null;
      })
    }
  })

  // create add todo window
  ipcMain.on('open-url', (e, url) => {
    // Track for login on the opened url
    addTrackingForUrl(url);
    var urlObj = new URL(url)
    
    // Create a title for the new window
    var windowTitle = 'Europa @ '.concat(url.substring(0, 100));
    if (url.length > 100) {
      windowTitle.concat('...');
    }
    
    var newJupyterWin = new BrowserWindow({
      width: 1080,
      height: 768,
      webPreferences: {
        nodeIntegration: false
      },
      icon: iconPath,
      frame: DRAW_FRAME,
      title: windowTitle
    })
    
    windowTracker[urlObj.origin] = newJupyterWin;
    newJupyterWin.loadURL(url);
    
    // Disable menu bar
    // newJupyterWin.setMenu(null)
    // newJupyterWin.setAutoHideMenuBar(true)

    // cleanup
    newJupyterWin.on('closed', () => {
      newJupyterWin = null
      removeTrackingForUrl(url);
    })
    newJupyterWin.once('ready-to-show', () => {
      newJupyterWin.show()
    })

    // Prevent the title from being updated
    newJupyterWin.on('page-title-updated', (evt) => {
      evt.preventDefault();
    });

    // Register shortcuts
    electronLocalshortcut.register(newJupyterWin, 'Ctrl+Shift+W', () => {
      newJupyterWin.close();
    });
  })

  ipcMain.on('add-recent-url', (event, url) => {
    const updatedUrls = todosData.pushFront(url, MAX_RECENT_ITEMS).todos

    mainWindow.send('todos', updatedUrls)
  })

  ipcMain.on('delete-recent-url', (event, todo) => {
    const updatedTodos = todosData.deleteTodo(todo).todos

    mainWindow.send('todos', updatedTodos)
  })

  ipcMain.on('dialog-result', (event, id, resp) => {
    dialogRespTracker[id](resp);
  });
}

app.on('ready', main)

app.on('window-all-closed', function () {
  app.quit()
})
