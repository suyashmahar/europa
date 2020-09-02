'use strict'

const Store = require('electron-store')

/**
 * Stores recently accessed URLs
 */
class RecentUrls extends Store {

  /**
   * Load urls or initialize to an empty array
   * @param {settings} settings Dictionary object for Store
   */
  constructor (settings) {
    super(settings);

    this.urls = this.get('recentUrls') || [];
  }

  /**
   * Save all the Urls to a JSON file
   */
  saveUrls() {
    this.set('recentUrls', this.urls);
    return this;
  }

  /**
   * Get an array of all the URLs
   */
  getUrls() {
    this.urls = this.get('recentUrls') || [];
    return this;
  }

  /**
   * Adds a new URL to the database and removes the oldest if the list exceeds
   * maxItems number of elements
   * @param {String} url Url to store
   * @param {integer} maxItems Maximum number of urls to keep
   */
  pushFront(url, maxItems) {
    /* Remove any previous recent item with same URL */
    this.urls = this.urls.filter(function(a){return a !== url;});
    
    /* Append the item */
    this.urls.unshift(url);
    
    while (this.urls.length > maxItems) {
      this.urls.pop();
    }

    return this.saveUrls();
  }

  /**
   * Removes a url from the DB
   * @param {url} todo URL to remove
   */
  remove(url) {
    // filter out the target url
    this.urls = this.urls.filter((elem) => {
      elem !== url
    });

    return this.saveUrls();
  }
}

module.exports = RecentUrls
