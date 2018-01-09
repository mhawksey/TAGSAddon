function collectionRun(action) {
  var startTime = new Date();
  var action = action || {};
  // get existing settings
  var settings = getDocProps_();
  var doc = SpreadsheetApp.getActive();
  var sheets = doc.getSheets();
  // get sheet object from sidebar selection
  for(var n in sheets){ // iterate all sheets and compare ids
    if(sheets[n].getSheetId()==settings.sheetId){break}
  }
  var sheet = sheets[n];

  // if metadata check sheet id hasn't changed
  if (settings.metadataId && settings.metadataId !== 'false'){
    try {
      var meta = Sheets.Spreadsheets.DeveloperMetadata.get (doc.getId() , settings.metadataId);
      var saved_sheet_id = meta.location.dimensionRange.sheetId.toString() || "0";
      var id_str_col_idx = meta.location.dimensionRange.startIndex;
      var id_str = sheet.getRange(1, id_str_col_idx+1).getValue();
      if (id_str !== 'id_str'){
        storeDocProp_('metadataId',false);
        return collectionRun();
      }
    } catch(e) {
      // sheet probably deleted so remove metadataId
      storeDocProp_('metadataId',false);
      return collectionRun();
    }
  } 
  // if no metadata or sheet has changed
  if (!settings.metadataId || saved_sheet_id !== settings.sheetId) {
    var id_str = sheet.getRange(1, 1).getValue();
    // if r1c1 not id_str and sheet not empty
    if(id_str !== 'id_str' && !isSheetEmpty_(sheet)){
      if (!isSheetEmpty_(sheet)){
          return Browser.msgBox("The sheet '"+sheet.getName()+"' isn't empty or an existing TAGS archive with an id_str column. Please wipe this sheet or select another", 
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
      // created header
      var cols_arr = getDocProp_('columns').split(',');
     
      cols_arr.unshift('id_str');
      sheet.getRange(1, 1, 1, cols_arr.length).setValues([cols_arr]);
      // remove extra extra row/cols
      sheet.deleteColumns(cols_arr.length+1, sheet.getMaxColumns() - sheet.getLastColumn());
      sheet.deleteRows(2, sheet.getMaxRows()-2);
      // freeze header
      sheet.setFrozenRows(1);
      // format cells
      sheet.getRange('1:2').setFontSize(8);
      sheet.getRange('A:A').setBackground('#efefef').setNumberFormat("@");
      
      // if there is a time col. set the datetime format
      var heads = sheet.getDataRange()
                       .offset(0, 0, 1)
                       .setFontWeight('bold')
                       .getValues()[0];
      for (var h=0; h < heads.length; h++){
        if (heads[h] === 'time'){
          sheet.getRange(1, h+1, sheet.getMaxRows()).setNumberFormat("yyyy-MM-dd HH:mm:ss");
        } else if (heads[h] === 'text' || heads[h] === 'full_text'){
          sheet.setColumnWidth(h+1, 350);
          sheet.getRange(1, h+1, sheet.getMaxRows()).setWrap(true);
        }
      }
      id_str_col_idx = 0;      
    }
    
    // store id_str in sheet metadata to find if it gets moved
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
    settings.metadataId = meta.replies[0].createDeveloperMetadata.developerMetadata.metadataId.toString();
    storeDocProp_('metadataId',settings.metadataId);
  }
  
  // getting data part
  var since_id = 0;
  // find first id_str value
  var id_strs = sheet.getRange(2, id_str_col_idx+1, settings.numberOfTweets).getValues();
  for (r in id_strs){
    if (id_strs[r][0] !== ""){
      settings.since_id = id_strs[r][0];
      break;
    }
  }
  doc.toast("Getting data...", "TAGS");
  var data = getTweets_(settings, doc);
  // if some data insert rows
  if (data.length>0){
    doc.toast("Inserting "+data.length+" tweets", "TAGS");
    sheet.insertRowsAfter(2, data.length);
    setRowsData_(sheet, data);
  }  
  var endTime = new Date();
  doc.toast("Time taken "+((endTime.getTime()/1000-startTime.getTime()/1000).toFixed(3))+"s", "TAGS");
  return {result: data.length};  
}

function setRowsData_(sheet, data){
 // these are the heads
  var heads = sheet.getDataRange()
                   .offset(0, 0, 1)
                   .getValues()[0];
  
  var tr = [];  
  // and the data
  data.forEach (function (row) {
    var td = [];
    heads.forEach (function (d) {
       td.push(row[d]);
    });
    tr.push(td);
  });
  sheet.getRange(2, 1, tr.length, tr[0].length).setValues(tr);
}

/**
* Get Tweets from API.
*
* @private
* @param {Object} params The query parameters.
* @param {string} type The type of API call to do.
*/
function getTweets_(settings, doc) {
  //var queryParams = getQueryParams_(params, type);
  var queryParams = {q: settings.search_term,
                     count: 100,
                     result_type: 'recent',
                     include_entities: 1,
                     since_id: settings.since_id || 0
                    };
  var numTweets = settings.numberOfTweets;
  if (numTweets > 18000)  numTweets = 18000;
  var maxPage = Math.ceil(numTweets/queryParams.count);
  var data = [];
  var idx = 0;
  try {
    var max_id = "";
    var max_id_url = "";
    var page = 1;
    var done = false;
    var maxid_str = "";
    
    while(!done){
      var responseData = get('search/tweets', queryParams);
      if (responseData.message){
        Logger.log(responseData.message);
        Browser.msgBox("Error", responseData.message, Browser.Buttons.OK);
        done = true;
      } else {
        if (responseData.statuses !== undefined){
          var objects = responseData.statuses;
        } else {
          var objects = responseData;
        }
        if (objects.length>0){ // if data returned
          for (i in objects){
            data.push(flattenDataFast(objects[i]));
          }
          queryParams.max_id = objects[objects.length-1]["id_str"];

        } else { // if not data break the loop
          Logger.log("no objects");
          done = true;
        }
        doc.toast("Fetched "+data.length+" tweets", "TAGS");
        page ++;
        if (page > maxPage) done = true; // if collected 16 pages (the max) break the loop
      } 
    } //end of while loop
    
    return removeDuplicates(data,'id_str');
  } catch (e) {
    Browser.msgBox("Line "+e.lineNumber+" "+e.message+e.name);
    return data;
  }
} 

// https://stackoverflow.com/a/38196571
function isSheetEmpty_(sheet) {
  return sheet.getDataRange().getValues().join("") === "";
}
/**
 * Remove duplicates from an array of objects in javascript
 * @param arr - Array of objects
 * @param prop - Property of each object to compare
 * @returns {Array}
 */
function removeDuplicates( arr, prop ) {
  var obj = {};
  for ( var i = 0, len = arr.length; i < len; i++ ){
    if(!obj[arr[i][prop]]) obj[arr[i][prop]] = arr[i];
  }
  var newArr = [];
  for ( var key in obj ) newArr.push(obj[key]);
  return newArr;
}
