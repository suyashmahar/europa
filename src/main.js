'use strict'

const path = require('path')
const { app, ipcMain, BrowserWindow } = require('electron')

const Window = require('./Window')
const DataStore = require('./DataStore')
const electronLocalshortcut = require('electron-localshortcut');
const commandExists = require('command-exists');
const { execSync } = require('child_process')
const { Server } = require('http')
const { exec } = require('child_process');
const { spawn } = require('child_process');
// var spawn = require("child_process").spawn,child;

require('electron-reload')(process.cwd())

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

// Runs OS specific script to start a jupyter lab server
function startServerOS(event, py, startAt, portNum) {
  if (process.platform === "win32") {
    var cwd = process.cwd();
    var scriptPath = path.join(cwd, 'scripts', 
      'windows', 'start_jupyter_lab.ps1');
      
      var cmd = `powershell.exe "${scriptPath}" "${py} ${startAt} ${portNum}"`;
      cmd = `powershell.exe '${scriptPath}' ${py} ${startAt} ${portNum}`
      // Execute the command async
    // console.log(`Cmd: ${cmd}`);
    // var child = exec(cmd, (error, stdout, stderr) => { 
    //   var result;
    //   if (error) {
    //     result = 'Failed'
    //     console.log('Error message:')
    //     console.error(stderr)
    //   } else {
    //     result = stdout
    //   }

    //   console.log(`result: ${result}`)
    //   event.sender.send('start-server-resp', result);
    // });

    var child = spawn("powershell.exe", [scriptPath, `${py} ${startAt} ${portNum}`])
    child.stdout.on("data",function(data){
      if (data) {
        event.sender.send('start-server-resp', data);
      }
      console.log("Powershell Data: " + data);
    });
    child.stderr.on("data",function(data){
      if (data) {
        event.sender.send('start-server-resp', data);
      }
      console.log("Powershell Errors: " + data);
    });

    console.log(`Child.killed = ${child.killed}`)
    
    // console.log(`params: ${[`'${scriptPath}' ${params}`]}`)
    // const childProcess = spawn(
    //   'powershell.exe', [`'${scriptPath}' ${params}`], {
    //     detached: true,
    //     // stdio: [ 'ignore', 1, 2 ]
    //   });
      
    //   childProcess.stdout.on('data', (data) => {
    //     event.sender.send('start-server-resp', data);
    //     childProcess.unref();
    // });
  }
}

function main () {
  let mainWindow = new Window({
    file: path.join('renderer', 'index.html')
  })

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
        file: path.join('renderer', 'add.html'),
        width: 500,
        height: 120,

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
    console.log(`main.js:174 Opening URL: ${url}`)

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
      console.log('You pressed ctrl+shift+w');
    });
  })

  // add-todo from add todo window
  ipcMain.on('add-todo', (event, todo) => {
    const updatedTodos = todosData.addTodo(todo).todos

    mainWindow.send('todos', updatedTodos)
  })

  // delete-todo from todo list window
  ipcMain.on('delete-todo', (event, todo) => {
    const updatedTodos = todosData.deleteTodo(todo).todos

    mainWindow.send('todos', updatedTodos)
  })
}

app.on('ready', main)

app.on('window-all-closed', function () {
  app.quit()
})