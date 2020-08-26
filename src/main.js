'use strict'

const path = require('path')
const { app, electron, ipcMain, BrowserWindow } = require('electron')

const Window = require('./Window')
const DataStore = require('./DataStore')
const electronLocalshortcut = require('electron-localshortcut');
const commandExists = require('command-exists');
const { execSync } = require('child_process')
const { spawn } = require('child_process');

require('electron-reload')(process.cwd())

const MAX_RECENT_ITEMS = 4;

// create a new todo store name "Todos Main"
const todosData = new DataStore({ name: 'Todos Main' })

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

function main () {
  let mainWindow = new Window({
    file: path.join('renderer', 'welcome.html')
  })

  // Hide menu bars
  // mainWindow.setMenu(null)
  // mainWindow.setAutoHideMenuBar(true)

  // add todo window
  let addTodoWin
  let newJupyterWin
  let newServerDialog

  // TODO: put these events into their own file

  // initialize with todos
  mainWindow.once('show', () => {
    mainWindow.webContents.send('todos', todosData.todos)
  })

  ipcMain.on('get-sys-cfg-jupyter-lab', (event) => {
    console.log('get-sys-cfg-jupyter-lab() called')
    var resp = (
      getPythonInterpreter()
    );
    event.sender.send('asynchronous-reply', resp);
  });

  ipcMain.on('start-server', (event, py, startAt, portNum) => {
    console.log('start-server() called');
    console.log([py, startAt, portNum]);
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

        // close with the main window
        parent: mainWindow
      })

      // Disable menu bar
      // addTodoWin.setMenu(null)
      // addTodoWin.setAutoHideMenuBar(true)

      // cleanup
      addTodoWin.on('closed', () => {
        addTodoWin = null
      })
    }
  })

  // create add todo window
  ipcMain.on('new-server-window', () => {
    // if addTodoWin does not already exist
    if (!newServerDialog) {
      // create a new add todo window
      newServerDialog = new Window({
        file: path.join('renderer', 'new_server', 'newserver.html'),
        width: 600,
        height: 450,
        maxWidth: 600,
        maxHeight: 450,
        minWidth: 600,
        minHeight: 450,
        // close with the main window
        parent: mainWindow
      })

      // Disable menu bar
      // newServerDialog.setMenu(null)
      // newServerDialog.setAutoHideMenuBar(true)

      // cleanup
      newServerDialog.on('closed', () => {
        newServerDialog = null
      })
    }
  })

  // create add todo window
  ipcMain.on('open-url', (e, url) => {
    console.log(`Opening URL: ${url}`)

    // Create a title for the new window
    var windowTitle = 'Europa @ '.concat(url.substring(0, 100));
    if (url.length > 100) {
      windowTitle.concat('...');
    }

    console.log(windowTitle);
    newJupyterWin = new BrowserWindow({
      width: 1080,
      height: 768,
      webPreferences: {
        nodeIntegration: false
      },
      title: windowTitle
    })
    newJupyterWin.loadURL(url);

    // Disable menu bar
    newJupyterWin.setMenu(null)
    newJupyterWin.setAutoHideMenuBar(true)

    // cleanup
    newJupyterWin.on('closed', () => {
      newJupyterWin = null
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

  // add-todo from add todo window
  ipcMain.on('add-recent-url', (event, url) => {
    const updatedUrls = todosData.pushFront(url, MAX_RECENT_ITEMS).todos

    mainWindow.send('todos', updatedUrls)
  })

  // ipcMain.on('selectDirectory', (event, callbackName) => {
  //     var dir = electron.dialog.showOpenDialog(mainWindow, {
  //         properties: ['openDirectory']
  //     });
  //     event.send(callbackName, dir)
  // });

  // delete-todo from todo list window
  ipcMain.on('delete-recent-url', (event, todo) => {
    const updatedTodos = todosData.deleteTodo(todo).todos

    mainWindow.send('todos', updatedTodos)
  })
}

app.on('ready', main)

app.on('window-all-closed', function () {
  app.quit()
})
