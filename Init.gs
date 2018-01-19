/**
 * @OnlyCurrentDoc
 */

var LANG = 'en';

/**
 * Adds a custom menu with items to show the sidebar and dialog.
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  var service = getTwitterService_();
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createAddonMenu()
      .addItem(script.i18n.getMessage('Setup Twitter Access', LANG), 'showSidebarSetup');
  if (service.hasAccess()){
      menu.addItem(script.i18n.getMessage('Create Collection', LANG), 'showSidebarCollection');
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



