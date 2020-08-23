'use strict'

const { ipcRenderer } = require('electron')

// delete todo by its text value ( used below in event listener)
const recentItemClicked = (e) => {
  console.log(e.target.textContent);
  // ipcRenderer.send('delete-todo', e.target.textContent)
  ipcRenderer.send('open-url', e.target.textContent);
}

document.getElementById('openUrlBtn').addEventListener('click', () => {
  ipcRenderer.send('open-url-window')
})
document.getElementById('newServerBtn').addEventListener('click', () => {
  ipcRenderer.send('new-server-window')
})

// on receive todos
ipcRenderer.on('todos', (event, todos) => {
  // get the todoList ul
  const todoList = document.getElementById('todoList')

  // create html string
  const todoItems = todos.reduce((html, todo) => {
    html += `<li class="recent-item"><a href="javascript:void" id="${todo}">${todo}</a></li>`

    return html
  }, '')

  // set list html to the todo items
  todoList.innerHTML = todoItems

  // add click handlers to delete the clicked todo
  todoList.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', recentItemClicked)
  })
})
