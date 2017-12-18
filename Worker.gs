function collectionRun(action) {
  var action = action || {};
  // get existing settings
  var setting = getDocProps_();
  var doc = SpreadsheetApp.getActive();
  var sheets = doc.getSheets();
  // get sheet object from sidebar selection
  for(var n in sheets){ // iterate all sheets and compare ids
    if(sheets[n].getSheetId()==setting.sheetId){break}
  }
  var sheet = sheets[n];

  // if metadata check sheet id hasn't changed
  if (setting.metadataId){
    // temp remove 
    var meta = Sheets.Spreadsheets.DeveloperMetadata.get (doc.getId() , setting.metadataId);
    var saved_sheet_id = meta.location.dimensionRange.sheetId.toString() || "0";
    var id_str_col_idx = meta.location.dimensionRange.startIndex;
  } 
  // if no metadata or sheet has changed
  if (!setting.metadataId || saved_sheet_id !== setting.sheetId) {
    var id_str = sheet.getRange(1, 1).getValue();
    // if r1c1 not id_str and sheet not empty
    if(id_str !== 'id_str' && !isSheetEmpty(sheet)){
      if (!isSheetEmpty(sheet)){
          return Browser.msgBox("The sheet '"+sheet.getName()+"' isn't empty or an existing TAGS archive. Please wipe this sheet or select another ", 
                                Browser.Buttons.OK);
      }
    } else if(id_str === 'id_str' && !action.import) {
      // there is an id_str so see if it should be imported for setup
      return Browser.msgBox("The sheet '"+sheet.getName()+"' looks like an old TAGS archive. Do you wish to use with the TAGS Add-on?", 
                                Browser.Buttons.YES_NO);
    }
    // at this point sheet is either empty or has an old archive so write the metadata
    
    if (!action.import){
      // if not importing TAGS setup the archive sheet
      
    }
    
    var requests = [{
      // stuff for a column level-----
      // CreateDeveloperMetadataRequest
      createDeveloperMetadata:{
        // DeveloperMetaData
        developerMetadata:{
          // DeveloperMetaDataLocation with column scope  
          metadataKey:"id_str_col",
          metadataValue:JSON.stringify({
            writtenBy:Session.getActiveUser().getEmail(),
            createdAt:new Date().getTime()
          }),
          location:{  
            dimensionRange: {
              sheetId:sheet.getSheetId(),
              dimension:"COLUMNS",
              startIndex:0,            
              endIndex:1                
            }
          },
          visibility:"DOCUMENT"      
        }
      }}];
    var meta = Sheets.Spreadsheets.batchUpdate({requests:requests},doc.getId());
    setting.metadataId = meta.replies[0].createDeveloperMetadata.developerMetadata.metadataId.toString();
    storeDocProp_('metadataId',setting.metadataId);
  }
  var since_id = 0;
  // find first id_str value
  var id_strs = sheet.getRange(2, id_str_col_idx+1, setting.volume).getValues();
  for (r in id_strs){
    if (id_strs[r][0] !== ""){
      since_id = id_strs[r][0];
      break;
    }
  }
  
  return since_id;
  // if destination sheet is not already an archive
  //   if existing archive (has id_str) and confirm
  //   elseif no id_str but data confirm before wipe
  // create metadata
  
  // get search settings
  // get data 
  // write data
  // provide result summary
  
}

// https://stackoverflow.com/a/38196571
function isSheetEmpty(sheet) {
  return sheet.getDataRange().getValues().join("") === "";
}
function test(){

}
