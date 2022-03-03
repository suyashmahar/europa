<p align="center">
  <img height="200" src="github-assets/banner.svg">
</p>

[![GPLv3 license](https://img.shields.io/badge/License-GPLv3-blue.svg)](http://perso.crans.org/besson/LICENSE.html)

# What is Europa?
Europa is a desktop client for JupyterLab that provides native app experience using standalone windows and keyboard shortcuts. 

Europa supports all the keyboard shortcuts for JupyterLab that you'd expect in a desktop application (like Ctrl+Tab to switch tabs, Ctrl+W to close a tab). More details are on the [Keyboard Shortcuts wiki page](https://github.com/suyashmahar/europa/wiki/Keyboard-shortcuts).

# Installation
You can either grab a portable app for linux/windows or grab OS specific installer from the [releases](https://github.com/suyashmahar/europa/releases).

### Debian/Ubuntu

```
curl -s --compressed "https://europa-sources.suyashmahar.com/debian/KEY.gpg" | sudo apt-key add -
sudo curl -s --compressed -o /etc/apt/sources.list.d/europa.list "https://europa-sources.suyashmahar.com/debian/europa.list"
sudo apt update && sudo apt-get install europa
```

### Other Operating Systems
Checkout the [Release Page](https://github.com/suyashmahar/europa/releases).

## CLI
Europa supports a CLI interface:
```
USAGE:
        europa [options]

OPTIONS:
        -u,--url <url>  Open a europa window for <url> on start.
        -v,--version    Print version number and exit.
        -h,--help       Print this help message and exit.
```

# Demo
(YouTube)  
[![Europa Demo video](https://imgur.com/download/dyLvkW8/)](https://www.youtube.com/watch?v=Qg6RwUoB6G0)

# Contributing
If Europa helped you in your work, please consider contributing to the project!

# Gallery

<p align="center">
  <img src="https://user-images.githubusercontent.com/21097167/134625146-a7b7d0e1-2d2f-4d30-84ff-de6dfde8fae6.png" width="400"> <img src="https://user-images.githubusercontent.com/21097167/134624744-1788ec8a-d75d-4e0e-91cf-f3e6257f4bed.png" width="400"> <img src="https://user-images.githubusercontent.com/21097167/134625215-b8dcc470-47d0-42d7-9796-c8a1fed002c0.png" width="400"> <img src="https://user-images.githubusercontent.com/21097167/134625337-49968b54-3163-4eb3-8afa-1f9c0282f20d.png" width="400">
</p>



# License
This program is distributed under the terms of the [GPL v3](https://perso.crans.org/besson/LICENSE.html), except when noted otherwise.

Rights to all artworks in this program are reserved, unless noted otherwise. Copyright (c) 2020-22 Suyash Mahar.
