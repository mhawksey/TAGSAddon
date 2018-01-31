/**
 * @OnlyCurrentDoc
 */

var LANG = 'en';
var GA_BATCH = [];

/**
 * Adds a custom menu with items to show the sidebar and dialog.
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createAddonMenu();
  if (e && e.authMode !== ScriptApp.AuthMode.NONE) {
    GATracking.init('UA-48225260-5');
    menu.addItem(script.i18n.getMessage('Setup Twitter', LANG), 'showSidebarSetup');
    if (getTwitterService_().hasAccess()){
      menu.addItem(script.i18n.getMessage('Collection', LANG), 'showSidebarCollection');
    }
  } 
  menu.addSubMenu(ui.createMenu('Utilities')
          .addItem('Wipe Sheet', 'wipeArchive'))
  menu.addToUi();
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

/**
* Show sidebar 
* @param {string} pageName to show in sidebar 
*/
function showSidebar_(pageName) {
  var service = getTwitterService_();
  var setting = getDocProps_();
  var template = HtmlService.createTemplateFromFile(pageName);
  template.email = Session.getEffectiveUser().getEmail();
  template.isSignedIn = service.hasAccess();
  if (!template.isSignedIn){ 
    template.authUrl = getAuthorizationUrl();
  } else {
    template.authUrl = "";
  }
  template.use_default_cols = (!setting.metadataId) ? true : false;
  template.auto_collect = (!setting.triggers) ? true : false;
  template.page_title = pageName; 
  template.page_url = SpreadsheetApp.getActive().getUrl();
  var page = template.evaluate()
      .setTitle('TAGS - '+pageName)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(page);
}

/**
* Wipes the archive sheet apart from header row
*/
function wipeArchive(){
  var result = Browser.msgBox("Warning!", 
                              "You are about to wipe this sheet\\n\\nDo you want to continue?", 
                              Browser.Buttons.YES_NO);
  // Process the user's response.
  if (result == 'yes') {
    var sheet = SpreadsheetApp.getActiveSheet()
    sheet.deleteRows(2, sheet.getLastRow()-1);
    showSidebarCollection();
  } 
}



