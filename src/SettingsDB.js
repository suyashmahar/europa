'use strict'

const Store = require('electron-store')

/**
 * Store and retrieve settings in dictionary format
 */
class SettingsDB extends Store {
  DEFAULT_SETTINGS = {
    'show-keyboard-shortcuts-dialog': 'ask',
  };

  /**
   * Load settings or initialize to the default settings
   * @param {settings} settings Dictionary object for Store
   */
  constructor (settings) {
    super(settings);

    this.settings = this.get('settingsDB') || this.DEFAULT_SETTINGS;
  }

  /**
   * Save all the settings to a JSON file
   */
  saveSettings(settings) {
    this.set('settingsDB', settings);
    return this;
  }

  /**
   * Get a dict of all the settings
   */
  getSettings() {
    this.settings = this.get('settingsDB') || this.DEFAULT_SETTINGS;
    return this.settings;
  }
}

module.exports = SettingsDB;
