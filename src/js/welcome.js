'use strict'

const { ipcRenderer, shell } = require('electron')

const winDecorations = require('../js/modules/winDecorations');
 
const recentItemClicked = (e) => {
  console.log(e.target.textContent);
  ipcRenderer.send('open-url', e.target.textContent);
}
const deleteRecentItemClicked = (e) => {
  console.log(e.target.getAttribute('id'));
  ipcRenderer.send('delete-recent-url', e.target.getAttribute('id'))
}

function main() {
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

  ipcRenderer.on('todos', (event, recentItemsList) => {
    const recentUrlElem = document.getElementById('todoList');

    // create an html string
    var recentUrlHtml = recentItemsList.reduce((html, item) => {
      var itemDeleteBtnHtml = `<a id="${item}" href="javascript:void" class="inline-btn-link-delete font-weight-bold">✕</a>`
      html += `<li class="recent-item"><a class="recent-item-link" href="javascript:void" id="${item}">${item}</a>${itemDeleteBtnHtml}</li>`

      return html;
    }, '')

    if (!recentUrlHtml) {
      recentUrlHtml = "No recent items";
    }

    // set list html to the todo items
    recentUrlElem.innerHTML = recentUrlHtml;

    // Add click handlers to the link
    todoList.querySelectorAll('.recent-item-link').forEach(item => {
      item.addEventListener('click', recentItemClicked)
    })

    // Add click handlers to the delete button
    todoList.querySelectorAll('.inline-btn-link-delete').forEach(item => {
      item.addEventListener('click', deleteRecentItemClicked)
    })
  })

  winDecorations.setupDecorations();
}

main();