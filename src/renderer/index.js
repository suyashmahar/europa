'use strict'

const { ipcRenderer, shell } = require('electron')

// delete todo by its text value ( used below in event listener)
const recentItemClicked = (e) => {
  console.log(e.target.textContent);
  // ipcRenderer.send('delete-todo', e.target.textContent)
  ipcRenderer.send('open-url', e.target.textContent);
}
const deleteRecentItemClicked = (e) => {
  console.log(e.target.getAttribute('id'));
  ipcRenderer.send('delete-todo', e.target.getAttribute('id'))
}

document.getElementById('openUrlBtn').addEventListener('click', () => {
  ipcRenderer.send('open-url-window')
})
document.getElementById('newServerBtn').addEventListener('click', () => {
  ipcRenderer.send('new-server-window')
})

// Listeners for help links
document.getElementById('helpReportIssue').addEventListener('click', () => {
  shell.openExternal('https://github.com/suyashmahar/jupytron/issues')
})
document.getElementById('helpGitHubRepo').addEventListener('click', () => {
  shell.openExternal('https://github.com/suyashmahar/jupytron')
})
document.getElementById('helpProductDocumentation').addEventListener('click', () => {
  shell.openExternal('https://github.com/suyashmahar/jupytron/wiki')
})
document.getElementById('helpTipsAndTricks').addEventListener('click', () => {
  shell.openExternal('https://github.com/suyashmahar/jupytron/wiki/TipsAndTricks')
})
document.getElementById('helpKeyboardShortcuts').addEventListener('click', () => {
  shell.openExternal('https://github.com/suyashmahar/jupytron/wiki/KeyboardShortcuts')
})


https://github.com/suyashmahar/jupytron/wiki

// on receive todos
ipcRenderer.on('todos', (event, todos) => {
  // get the todoList ul
  const todoList = document.getElementById('todoList')

  // create html string
  const todoItems = todos.reduce((html, todo) => {
    var itemDeleteBtnHtml = `<a id="${todo}" href="javascript:void" class="inline-btn-link-delete">✕</a>`
    html += `<li class="recent-item"><a class="recent-item-link" href="javascript:void" id="${todo}">${todo}</a>${itemDeleteBtnHtml}</li>`

    return html
  }, '')

  // set list html to the todo items
  todoList.innerHTML = todoItems

  // Add click handlers to the link
  todoList.querySelectorAll('.recent-item-link').forEach(item => {
    item.addEventListener('click', recentItemClicked)
  })

  // Add click handlers to the delete button
  todoList.querySelectorAll('.inline-btn-link-delete').forEach(item => {
    item.addEventListener('click', deleteRecentItemClicked)
  })
})
