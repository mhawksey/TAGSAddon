/**
 * @OnlyCurrentDoc
 */


/**
 * Adds a custom menu with items to show the sidebar and dialog.
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
      .createAddonMenu()
      .addItem('Setup Twitter', 'showSidebarSetup')
      .addItem('Start collection', 'showSidebarCollection')
      .addToUi();
}

/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initializion work is done immediately.
 *
 * @param {Object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Opens a sidebar. The sidebar structure is described in the Twitter Setup.html
 * project file.
 */
function showSidebarSetup() {
  showSidebar_('Twitter Setup');
}

/**
 * Opens a sidebar. The sidebar structure is described in the Collection.html 
 */
function showSidebarCollection() {
  showSidebar_('Collection');
}

function showSidebar_(pageName) {
  var service = getTwitterService_();
  var template = HtmlService.createTemplateFromFile(pageName);
  template.email = Session.getEffectiveUser().getEmail();
  template.isSignedIn = service.hasAccess();
  if (!template.isSignedIn){ 
    template.authUrl = getAuthorizationUrl();
  } else {
    template.authUrl = "";
  }
  var page = template.evaluate()
      .setTitle('TAGS - '+pageName)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(page);
}

/**
 * Return sheet names to the sidebar. 
 */
function getSheetNames(existing_sheets){
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var current_sheets = {};
  current_sheets.options = sheets.map(function(s){ 
    return {value: s.getSheetId(), text: s.getSheetName()}
  });
  var curr = JSON.stringify(current_sheets)
  if (JSON.stringify(existing_sheets.options) === JSON.stringify(current_sheets.options)){
    return false; 
  } else {
    var selected_sheet = getDocProp_("sheetId") || false; 
    current_sheets.selected = selected_sheet
    return current_sheets;
  }
}

/**
 * Store settings for index.html.
 * @param {Object} settings to store in Properties Service.
 * @param {string} type of Properties Service.
 */
function storeSettings(settings, type){
  switch (type){
    case 'doc':
      storeDocProp_(Object.keys(settings)[0], 
                 settings[Object.keys(settings)[0]]);
      break;
    case 'user':
      storeUserProp_(Object.keys(settings)[0], 
                 settings[Object.keys(settings)[0]]);
      break;
  }
}

/**
 * Get settings for index.html.
 * @param {string} key The property key.
 * @param {string} type of Properties Service.
 * @param {string} fieldType The form element type.
 * @param {Object} settings.
 */
function getSettings(key, type, fieldType){
  switch (type){
    case 'doc':
      var value = getDocProp_(key);
      break;
    case 'user':
      var value = getUserProp_(key);
      break;
  }
  return {id: key, 
          value: value || "",
          type: fieldType};
}

/**
 * Sets a static document property, using caching.
 * @param {string} key The property key.
 * @param {string} value The property value.
 */
function storeDocProp_(key, value){
  PropertiesService.getDocumentProperties().setProperty(key, value);
  CacheService.getDocumentCache().put(key, value, 86400);
}

/**
 * Sets a static user property, using caching.
 * @param {string} key The property key.
 * @param {string} value The property value.
 */
function storeUserProp_(key, value){
  PropertiesService.getUserProperties().setProperty(key, value);
  CacheService.getUserCache().put(key, value, 86400);
}

/**
 * Gets a static document property, using caching.
 * @param {string} key The property key.
 * @returns {string} The property value.
 */
function getDocProp_(key){
  var value = CacheService.getDocumentCache().get(key);
  if (!value){
    var value = PropertiesService.getDocumentProperties().getProperty(key);
    CacheService.getDocumentCache().put(key, value, 86400);
  }
  return value;
}

/**
 * Gets a static user property, using caching.
 * @param {string} key The property key.
 * @returns {string} The property value.
 */
function getUserProp_(key){
  var value = CacheService.getUserCache().get(key);
  if (!value){
    var value = PropertiesService.getUserProperties().getProperty(key);
    CacheService.getUserCache().put(key, value, 86400);
  }
  return value;
}

/**
 * Gets a static script property, using caching.
 * @param {string} key The property key.
 * @returns {string} The property value.
 */
function getScriptProp_(key){
  var value = CacheService.getScriptCache().get(key);
  if (!value){
    var value = PropertiesService.getScriptProperties().getProperty(key);
    CacheService.getScriptCache().put(key, value, 86400);
  }
  return value;
}

/**
 * Gets a consumer property from user or fallback from script, using caching.
 * @param {string} key The property key.
 * @returns {string} The property value.
 */
function getConsumer_(key){
  // try user prop fallback on script prop
  return getUserProp_(key) || getScriptProp_(key);
}

/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Configures the service.
 */
function getTwitterService_() {
  return OAuth1.createService('Twitter')
      // Set the endpoint URLs.
      .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
      .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
      .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')

      // Set the consumer key and secret.
      .setConsumerKey(getConsumer_('consumer_key'))
      .setConsumerSecret(getConsumer_('consumer_secret'))

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('authCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties());
}

/**
 * Callback handler that is executed after an authorization attempt. 
 * @param {Object} request The results of API auth request.
 */
function authCallback(request) {
  var template = HtmlService.createTemplateFromFile('Callback');
  template.email = Session.getEffectiveUser().getEmail();
  template.isSignedIn = false;
  template.error = null;
  var title;
  try {
    var service = getTwitterService_();
    var authorized = service.handleCallback(request);
    template.isSignedIn = authorized;
    title = authorized ? 'Access Granted' : 'Access Denied';
  } catch (e) {
    template.error = e;
    title = 'Access Error';
  }
  template.title = title;
  return template.evaluate()
      .setTitle(title)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * Builds and returns the authorization URL from the service object.
 * @return {String} The authorization URL.
 */
function getAuthorizationUrl() {
  try {
    return getTwitterService_().authorize();
  } catch(e){
    return false; 
  }
}

/**
 * Resets the API service, forcing re-authorization before
 * additional authorization-required API calls can be made.
 * @return {String} The authorization URL.
 */
function signOut() {
  getTwitterService_().reset();
  return getAuthorizationUrl();
}