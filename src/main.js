// -*- js-indent-level: 2; -*-

'use strict'

const path = require('path')
const request = require('request')
const { app, BrowserWindow, ipcMain, Menu, session } = require('electron')
const fs = require('fs')
const os = require('os')
const process = require('process')

const Window = require('./Window')
const RecentUrlsDB = require('./RecentUrlsDB')
const SettingsDB = require('./SettingsDB')
const electronLocalshortcut = require('electron-localshortcut')
const commandExists = require('command-exists')
const { execSync } = require('child_process')
const { spawn } = require('child_process')
const { pathToFileURL } = require('url')

const EUROPA_HELP_SHORTCUTS_LINK = 'https://github.com/suyashmahar/europa/wiki/Keyboard-shortcuts'
const EUROPA_UNSUPPORTED_JUPYTER_LINK = 'https://github.com/suyashmahar/europa/wiki/Supported-JupyterLab-Versions'

const MAX_RECENT_ITEMS = 4
const SHORTCUT_SEND_URL = `/lab/api/settings/@jupyterlab/shortcuts-extension:shortcuts`
const USER_AGENT_STR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
const DRAW_FRAME = true
const VERSION_STRING = '1.1.0'

/* Create all the data stores */
const recentUrlsDb = new RecentUrlsDB({ name: 'recent_urls' })
const settingsDb = new SettingsDB({ name: 'global_settings' })

let appDir = __dirname
let iconPath
let mainWindow, settingsWin, openUrlWin, newServerDialog

let referrer

// Tracks all the url opened so far
let JUPYTER_REQ_FILTER = {
  urls: ['*://*/*']
}

// url filter to see if the login was successful
let JUPYTER_LOGIN_SUCCESS_FILTER = {
  urls: ['*://*/*api/contents/*']
}

// Tracks login for a host
let loginTracker = {}
// Tracks window for a url
let windowTracker = {}
// Tracks the dialog box responses
let dialogRespTracker = {}
// Tracks jupyter format cookie for urls
let jupyterCookieTracker = {}

let fixASARPath = () => {
  if (appDir.endsWith('.asar')) {
    appDir = path.dirname(appDir)
  }
}

let getPythonInterpreter = () => {
  let result
  let found = commandExists.sync('python3') ||
                commandExists.sync('python')
  if (found) {
    result = execSync(`python -c "import sys; print(sys.executable)"`)
  }

  return result
}

// Monitor the started child process for starting jupyter lab server
let monitorStartServerChild = (event, child) => {
  child.stdout.on('data', function (data) {
    if (data) {
      event.sender.send('start-server-resp', data)
    }
  })
  child.stderr.on('data', function (data) {
    if (data) {
      event.sender.send('start-server-resp', data)
    }
    console.error('Shell Errors: ' + data)
  })
}

/**
 * Starts a new JupyterLab server on Windows OS. See @ref startServer
 */
let startServerWindows = (event, py, startAt, portNum) => {
  let scriptPath = path.join(appDir, 'scripts',
    'windows', 'start_jupyter_lab.ps1')

  // Execute the command async
  let child = spawn('powershell.exe', [scriptPath, `${py} ${startAt} ${portNum}`])
  monitorStartServerChild(event, child)
}

/**
 * Starts a new JupyterLab server in posix environment. See @ref startServer
 */
let startServerLinux = (event, py, startAt, portNum) => {
  let scriptPath = path.join(appDir, 'scripts',
    'posix', 'start_jupyter_lab.sh')

  // Execute the command async
  let child = spawn('sh', [scriptPath, py, startAt, portNum])
  monitorStartServerChild(event, child)
}

/**
 * Start JupyterLab server using a OS dependent script
 * @param {*} event
 * @param {String} py Path to python interpreter
 * @param {String} startAt Directory to start JupyterLab at
 * @param {String} portNum {0-64k|'auto'}
 */
let startServerOS = (event, py, startAt, portNum) => {
  if (process.platform === 'win32') {
    startServerWindows(event, py, startAt, portNum)
  } else if (process.platform === 'linux') {
    startServerLinux(event, py, startAt, portNum)
  } else {
    console.error('Unsupported platform ' + process.platform)
  }
}

/**
 * Set platform specific icon file.
 */
function setupIcons () {
  if (os.platform() === 'win32') {
    iconPath = path.join(__dirname, 'assets', 'img', 'europa_logo.ico')
  } else if (os.platform() === 'linux') {
    iconPath = path.join(__dirname, 'assets', 'img', 'europa_logo.png')
  } else if (os.platform() === 'darwin') {
    iconPath = path.join(__dirname, 'assets', 'img', 'europa_logo.icns')
  } else {
    console.warn(`Platform ${os.platform()} has not icon set.`)
  }
}

/**
 * Show warning for an unsupported version of jupyter lab
 */
let showUnsupportedJupyterMsg = (urlObj) => {
  const props = {
    'type': 'warning',
    'title': 'Unsupported JupyterLab version',
    'content': `<p>Unsupported version of JupyterLab.</p><p class="text-secondary">Some of the Europa's functionality will be disabled (e.g., automatic shortcut configuration). <a onClick="shell.openExternal('${EUROPA_UNSUPPORTED_JUPYTER_LINK}'); return false;" href="javascript:void">Know More</a>.</p>`,
    'primaryBtn': 'OK',
    'secondaryBtn': ''
  }
  createDialog(windowTracker[urlObj.origin], props, `${Date.now()}`, (resp) => {})
}

/**
 * Check if the shortcuts needs to be set (before asking user)
 * Generate a GET request on the keyboard settings URL and compare the response
 */
const shouldSetShortcuts = (urlObj, callback) => {
  const userKbdDialogPref = getSettings()['show-keyboard-shortcuts-dialog']
  const shortcutDialogEnabled = (userKbdDialogPref === 'ask')
  // Work on urlObj
  let pathname = urlObj.pathname
  let pathCutTemp = pathname.split('/')
  let path = ''
  if (pathCutTemp.length >= 3) {
    path = pathCutTemp[1] + '/' + pathCutTemp[2]
  }

  if (shortcutDialogEnabled === false) {
    return
  }

  let reqUrl = `${urlObj.origin}/${path}${SHORTCUT_SEND_URL}`

  request.get(
    {
      url: reqUrl,
      headers: {
        'Host': urlObj.host,
        'Origin': urlObj.origin,
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'cookie': jupyterCookieTracker[urlObj.origin]['cookie'],
        'X-XSRFToken': jupyterCookieTracker[urlObj.origin]['xsrf'],
        'User-Agent': USER_AGENT_STR
      }
    },
    function (error, response, body) {
      let result = false
      if (!error) {
        let rcvData = JSON.parse(body)
        if (rcvData['raw']) {
          if (rcvData['raw'].length === 2) {
            result = true
          }
        } else {
          showUnsupportedJupyterMsg(urlObj)
        }
        result = true
      } else {
        showUnsupportedJupyterMsg(urlObj)
      }
      callback(result)
    })
}

function askUserForShortcuts (url, window) {
  let props = {
    'type': 'question',
    'title': 'Set shorcuts?',
    'primaryBtn': 'Yes',
    'secondaryBtn': 'No',
    'content': `
      <p>Set JupyterLab shortcuts for Europa?</p>
      <p class="text-secondary">E.g., Alt+Tab to switch tabs. Note that these 
      changes are persistent. 
        <a onClick="shell.openExternal('${EUROPA_HELP_SHORTCUTS_LINK}'); return false;" href="javascript:void">
          Know More
        </a>
      </p>`
  }

  let id = url + '_ask_shortcuts'
  createDialog(window, props, id, (resp) => {
    if (resp === 'primary') {
      sendShortcuts(id)
    }
  })
}

/**
 * Sends a PUT request for the custom shortcut to link in the id
 * @param {string} id url + tag
 */
function sendShortcuts (id) {
  let url = id.replace(/_ask_shortcuts/, '')
  let urlObj = new URL(url)

  const shortcutsFile = path.join(
    appDir, 'config', 'jupyter_keyboard_shortcuts.json'
  )

  const jsonData = fs.readFileSync(shortcutsFile)

  request.put(
    {
      url: `${urlObj.origin}${SHORTCUT_SEND_URL}?${Date.now()}`,
      headers: {
        'Host': urlObj.host,
        'Origin': urlObj.origin,
        'Connection': 'keep-alive',
        'Content-Type': 'text/plain',
        'Content-Length': jsonData.length,
        'cookie': jupyterCookieTracker[urlObj.origin]['cookie'],
        'X-XSRFToken': jupyterCookieTracker[urlObj.origin]['xsrf'],
        'User-Agent': USER_AGENT_STR
      },
      body: jsonData
    },
    function (error, response, body) {
      if (!error) {
        windowTracker[urlObj.origin].reload()
      }
    })
}

/**
 * Creates a dialog box
 * @param {BrowserWindow} window
 * @param {dictionary} props Properties of the dialog box, check dialogbox.js
 * @param {string} id unique identifier for this dialog box
 */
function createDialog (window, props, id, callback) {
  let dialogBox = new Window({
    file: path.join('renderer', 'dialog_box', 'dialogbox.html'),
    width: 500,
    height: 230,
    icon: iconPath,
    frame: DRAW_FRAME,
    useContentSize: true,

    // close with the main window
    parent: window
  })

  electronLocalshortcut.register(dialogBox, 'Esc', () => {
    dialogBox.close()
  })

  dialogBox.webContents.on('did-finish-load', () => {
    dialogBox.webContents.send('construct', props, id)
  })

  dialogRespTracker[id] = callback
}

/**
 * Starts a request interceptor to check if the user has logged into the server.
 * This is done to only show the keyboard shortcut dialog once the user has been
 * authenticated.
 */
function startHTTPProxy () {
  const webRequest = session.defaultSession.webRequest
  webRequest.onBeforeSendHeaders(JUPYTER_REQ_FILTER,
    (details, callback) => {
      if (details.uploadData) {
        referrer = details.referrer
      }
      callback(details)
    })

  webRequest.onHeadersReceived(JUPYTER_LOGIN_SUCCESS_FILTER,
    (details, callback) => {
      if (details) {
        let urlObj = new URL(details.url)
        if (!(urlObj.origin in loginTracker)) {
          loginTracker[urlObj.origin] = true

          getCookies(details.url, () => {
            shouldSetShortcuts(urlObj, (result) => {
              if (result) {
                console.log(result)
                askUserForShortcuts(details.url, windowTracker[urlObj.origin])
              }
            })
          })
        }
      }
      callback(details)
    })
}

/**
 * Sets all the cookies in jupyterCookieTracker using JupyterLab's format
 * @param {String} urlRequested URL to get cookies for
 * @param {function} callback Callback function
 */
function getCookies (urlRequested, callback) {
  const urlObj = new URL(urlRequested)
  let domain = urlObj.hostname
  return session.defaultSession.cookies.get(
    { domain },
    (error, result) => {
      let key = urlObj.origin

      // console.log(`Total ${result.length} cookies found`)

      /* Generate cookie in JupyterLab's format */
      jupyterCookieTracker[key] = { 'cookie': undefined, 'xsrf': undefined }
      jupyterCookieTracker[key]['cookie'] = result[0]['name']
      jupyterCookieTracker[key]['cookie'] += '='
      jupyterCookieTracker[key]['cookie'] += result[0]['value']
      jupyterCookieTracker[key]['cookie'] += '; '
      jupyterCookieTracker[key]['cookie'] += result[1]['name']
      jupyterCookieTracker[key]['cookie'] += '='
      jupyterCookieTracker[key]['cookie'] += result[1]['value']

      // console.log(`Cookie generated: ${jupyterCookieTracker[key]['cookie']}`);

      jupyterCookieTracker[key]['xsrf'] = result[0]['value']

      // console.log(`XSRF generated: ${jupyterCookieTracker[key]['xsrf']}`);

      callback()
      return result
    }
  )
}

function addTrackingForUrl (url) {

}

/**
 * Rmoves a URL from the list of tracked URL and the existing information is
 * lost
 * @param {String} url URL to remove tracking for
 */
function removeTrackingForUrl (url) {
  const urlObj = new URL(url)
  if (urlObj.origin in loginTracker) {
    delete loginTracker[urlObj.origin]
  }
}

/**
 * Shows a 404 page on event.sender BrowserWindow
 * @param {*} event
 * @param {*} errorCode
 * @param {*} errorDescription
 * @param {String} validatedUrl URL that resulted in the error
 * @param {*} isMainFrame
 */
function show404 (event, errorCode, errorDescription, validatedUrl, isMainFrame) {
  event.sender.webContents.removeListener('did-fail-load', show404)
  let errorPagePath = path.join(__dirname, 'renderer', '404_page', '404page.html')
  event.sender.loadURL(pathToFileURL(errorPagePath).href)

  electronLocalshortcut.register(event.sender, 'Ctrl+R', () => {
    event.sender.loadURL(validatedUrl)
  })
}

function showOptionsWindow () {
  if (!settingsWin) {
    settingsWin = new Window({
      file: path.join('renderer', 'settings_page', 'settings.html'),
      width: 700,
      height: 600,
      icon: iconPath,
      frame: DRAW_FRAME,

      // close with the main window
      parent: mainWindow
    })

    // cleanup
    settingsWin.on('closed', () => {
      settingsWin = null
    })

    // Register shortcuts
    electronLocalshortcut.register(settingsWin, 'Esc', () => {
      settingsWin.close()
    })

    settingsWin.webContents.on('did-finish-load', () => {
      settingsWin.webContents.send('settings-value', getSettings())
    })
  }
}

/**
 * Clear cache, useful when same site has multiple cookies stored
 */
function clearCache () {
  session.defaultSession.clearStorageData()
}

/**
 * Saves settings to disk
 * @param {dictionary} settingsObj Settings to save
 */
function setSettings (settingsObj) {
  settingsDb.saveSettings(settingsObj)
}
/**
 * Gets the settings from disk and returns a dictionary object
 */
function getSettings () {
  return settingsDb.getSettings()
}

/**
 * The about dialog box for copyright and license information
 */
function showAboutDialog (win) {
  const aboutDialogContents = `
    <h4>About Europa v${VERSION_STRING}</h4>
    <p>Copyright &#169; 2020 Suyash Mahar</p>
    <p class="text-secondary">
      This program is distributed under the terms of the 
      <a onClick="shell.openExternal('https://www.gnu.org/licenses/gpl-3.0.en.html'); return false;" href="javascript:void">GPL v3</a>. 
      Link to the 
      <a class="text-small" onClick="shell.openExternal('https://github.com/suyashmahar/europa'); return false;" href="javascript:void">
        Source code.
      </a>
    </p>
  `

  const props = {
    'type': 'info',
    'title': 'About Europa',
    'content': aboutDialogContents,
    'primaryBtn': 'OK',
    'secondaryBtn': ''
  }

  createDialog(mainWindow, props, String(Date.now()), () => void 0)
}

function showOpenURLDialog () {
  if (!openUrlWin) {
    // create a new add todo window
    openUrlWin = new Window({
      file: path.join('renderer', 'add_url', 'add_url.html'),
      width: 500,
      height: 120,
      resizable: false,
      icon: iconPath,
      frame: DRAW_FRAME,

      // close with the main window
      parent: mainWindow
    })

    // cleanup
    openUrlWin.on('closed', () => {
      openUrlWin = null
    })

    // Register shortcuts
    electronLocalshortcut.register(openUrlWin, 'Esc', () => {
      openUrlWin.close()
    })
  }
}

/**
 * Shows the window for creating a new JuptyerLab server
 */
function showNewServerDialog () {
  if (!newServerDialog) {
    newServerDialog = new Window({
      file: path.join('renderer', 'new_server', 'newserver.html'),
      width: 600,
      height: 450,
      maxWidth: 600,
      maxHeight: 450,
      minWidth: 600,
      minHeight: 450,
      resizable: false,

      // close with the main window
      parent: mainWindow,

      icon: iconPath,
      frame: DRAW_FRAME
    })

    // Register shortcuts
    electronLocalshortcut.register(newServerDialog, 'Esc', () => {
      newServerDialog.close()
    })

    // cleanup
    newServerDialog.on('closed', () => {
      newServerDialog = null
    })
  }
}

/**
 * Browse a URL using Europa's browser window
 * @param {String} url URL to browse to
 */
function showEuropaBrowser (e, url) {
  let urlObj
  try {
    urlObj = new URL(url)
  } catch (error) {
    const props = {
      'type': 'error',
      'title': 'URL Error',
      'content': `
      <p>Invalid URL entered</p>
      <p class="text-secondary">Europa did not understant '${url}' as a valid URL. Please make sure that the URL includes the protocol (e.g., http:// or https://).</p>`,
      'primaryBtn': 'OK',
      'secondaryBtn': ''
    }
    createDialog(mainWindow, props, `${Date.now()}`, (resp) => {})
    return
  }

  addRecentURL(url)

  // Track for login on the opened url
  addTrackingForUrl(url)

  // Create a title for the new window
  let windowTitle = 'Europa @ '.concat(url.substring(0, 100))
  if (url.length > 100) {
    windowTitle.concat('...')
  }

  let newJupyterWin = new BrowserWindow({
    width: 1080,
    height: 768,
    preload: path.join(appDir, 'js', 'preload404.js'),
    webPreferences: {
      nodeIntegration: false,
      plugins: true
    },
    icon: iconPath,
    frame: DRAW_FRAME,
    title: windowTitle
  })

  windowTracker[urlObj.origin] = newJupyterWin
  newJupyterWin.loadURL(url)

  /* Set did-fail-load listener once */
  newJupyterWin.webContents.on('did-fail-load', show404)

  /* cleanup */
  newJupyterWin.on('closed', () => {
    newJupyterWin = null
    removeTrackingForUrl(url)
  })

  newJupyterWin.once('ready-to-show', () => {
    newJupyterWin.show()
  })

  /* Prevent the title from being updated */
  newJupyterWin.on('page-title-updated', (evt) => {
    evt.preventDefault()
  })

  /* Register shortcuts */
  electronLocalshortcut.register(newJupyterWin, 'Ctrl+Shift+W', () => {
    newJupyterWin.close()
  })
}

function addMainWindowShortcuts () {
  electronLocalshortcut.register(mainWindow, 'Ctrl+O', showOpenURLDialog)
  electronLocalshortcut.register(mainWindow, 'Ctrl+N', showNewServerDialog)
}

/**
 * Add a new url to the recent list and update mainWindow
 * @param {String} url URL to add to the recent list
 */
function addRecentURL (url) {
  const updatedUrls = recentUrlsDb.pushFront(url, MAX_RECENT_ITEMS).urls
  mainWindow.send('recent-urls', updatedUrls)
}

/**
 * Add listeners for getting and setting recent URL list
 */
function addRecentURLListeners () {
  ipcMain.on('delete-recent-url', (event, url) => {
    const updatedUrls = recentUrlsDb.remove(url).urls
    mainWindow.send('recent-urls', updatedUrls)
  })
}

function printCLIHeader() {
    console.log("Europa " + VERSION_STRING)
}

function printCLIHelp(args, header, stderr) {
  let log_obj

  if (stderr) {
    log_obj = console.error
  } else {
    log_obj = console.log
  }
  
  if (header) {
    printCLIHeader()
    log_obj("")
  }

  log_obj("USAGE:\n\t" + args[0] + " [options]")
  log_obj()
  log_obj("OPTIONS:")
  log_obj("\t-u,--url <url> \tOpen a europa window for <url> on start.")
  log_obj("\t-v,--version   \tPrint version number and exit.")
  log_obj("\t-h,--help      \tPrint this help message and exit.")
  log_obj()
  log_obj("OTHER:")
  log_obj("\tCopyright (c) 2020-21 Europa Authors")
  log_obj("\tReport bugs at: https://europa.suyashmahar.com/report-bugs")
}

function printCLIVersion() {
  printCLIHeader();
}

/**
 * Parse command line arguments
 */
function parseCmdlineArgs() {
  let args = process.argv
  let result = {'url': ''}

  for (let i = 1; i < args.length; i++) {
    if (args[i] == "--help" || args[i] == "-h") {
      printCLIHelp(args, true)
      app.exit(0)
    } else if (args[i] == "--version" || args[i] == "-v") {
      printCLIVersion()
      app.exit(0)
    } else if (args[i] == "--url" || args[i] == "-u") {
      if (args.length < i + 2) {
        console.error("--url requires exactly one argument")
        console.error()
        printCLIHelp(args, false, true)
      }
      
      result['url'] = args[i + 1]
      i += 1
    } else {
      console.error("Unknown argument '" + args[i] + "'")
      console.error()
      printCLIHelp(args, false, true)
      app.exit(1)
    }    
  }

  return result
}

function main () {
  let args = parseCmdlineArgs()
  
  fixASARPath()

  setupIcons()
  startHTTPProxy()

  Menu.setApplicationMenu(null)

  mainWindow = new Window({
    file: path.join('renderer', 'welcome.html'),
    titleBarStyle: 'hidden',
    icon: iconPath,
    frame: DRAW_FRAME
  })

  mainWindow.once('show', () => {
    mainWindow.webContents.send('recent-urls', recentUrlsDb.urls)
  })

  addMainWindowShortcuts()
  addRecentURLListeners()

  ipcMain.on('get-sys-cfg-jupyter-lab', (event) =>
    event.sender.send('asynchronous-reply', getPythonInterpreter()))
  ipcMain.on('start-server', startServerOS)
  ipcMain.on('save-settings', (e, settingsObj) => setSettings(settingsObj))
  ipcMain.on('clear-cache', clearCache)
  ipcMain.on('options-window', showOptionsWindow)
  ipcMain.on('open-new-url', showOpenURLDialog)
  ipcMain.on('new-server-window', showNewServerDialog)
  ipcMain.on('open-url', showEuropaBrowser)
  ipcMain.on('show-about-europa', e => showAboutDialog(e.sender))
  ipcMain.on('dialog-result', (event, id, resp) => dialogRespTracker[id](resp))

  if (args['url'] != "") {
    showEuropaBrowser(null, args.url)
  }
}

app.on('ready', main)

app.on('window-all-closed', function () {
  app.quit()
})
