'use strict'

const path = require('path')
const { app, ipcMain, BrowserWindow } = require('electron')

const Window = require('./Window')
const DataStore = require('./DataStore')

require('electron-reload')(__dirname)

// create a new todo store name "Todos Main"
const todosData = new DataStore({ name: 'Todos Main' })

function main () {
  // todo list window
  let mainWindow = new Window({
    file: path.join('renderer', 'index.html')
  })

  // add todo window
  let addTodoWin

  // TODO: put these events into their own file

  // initialize with todos
  mainWindow.once('show', () => {
    mainWindow.webContents.send('todos', todosData.todos)
  })

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
        width: 500,
        height: 120,
        // close with the main window
        parent: mainWindow
      })

      // Disable menu bar
      newServerDialog.setMenu(null)
      newServerDialog.setAutoHideMenuBar(true)

      // cleanup
      newServerDialog.on('closed', () => {
        newServerDialog = null
      })
    }
  })

  // create add todo window
  ipcMain.on('open-url', (e, url) => {
    console.log(url);
    // if addTodoWin does not already exist
    if (!newJupyterWin) {
      // create a new add todo window
      newJupyterWin = new BrowserWindow({
        width: 500,
        height: 120,
        // close with the main window
        parent: mainWindow
      })
      newJupyterWin.loadURL(url);

      // Disable menu bar
      // newJupyterWin.setMenu(null)
      // newJupyterWin.setAutoHideMenuBar(true)

      // cleanup
      newJupyterWin.on('closed', () => {
        newJupyterWin = null
      })
      newJupyterWin.once('ready-to-show', () => {
        newJupyterWin.show()
      })
    }
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
