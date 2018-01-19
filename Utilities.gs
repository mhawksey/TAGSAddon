function flattenDataFast_(ob){
  var c = {}, p = {};
  Object.keys(ob).forEach( function (k) {
    c.key = k;
    c.value = ob[c.key] || null;
    switch(k){
      case 'user':
        for (u in ob.user){
          p['user_'+u] = ob.user[u];
        }
        p['profile_image_url'] = ob.user.profile_image_url_https
        p['user_entities_str'] = JSON.stringify(ob.user.entities);
        p['from_user'] = ob.user.screen_name;
        p['from_user_id_str'] = ob.user.id_str;
        p['status_url'] = 'http://twitter.com/'+ob.user.screen_name+"/statuses/"+ob.id_str;
        p['user_url'] = (ob.user.entities.url) ? ob.user.entities.url.urls[0] : null;
        break;
      case 'metadata':
        for (m in ob.metadata){
          p['metadata_'+m] = ob.metadata[m];
        }
      case 'user_url':
        if (ob.user.entities.url !== undefined){
          p[c.key] = ob.user.entities.url.urls[0]
        }
        break;
      case 'full_text':
        if (!ob.retweeted_status){
          p['text'] = ob.full_text
        } else {
          p['text'] = "RT @"+ob.retweeted_status.user.screen_name+": "+ob.retweeted_status.full_text;
        }
        break;
      case 'created_at':
        p['created_at'] = c.value
        p['time'] = new Date(c.value);
        p['entities_str'] = JSON.stringify(ob.entities);
        break;
      default:
        p[c.key] = c.value
    }
  });
  return p;
}

function checkSheetMetadata_(doc, sheet, settings, action, fnLabel){
  // if metadata check sheet id hasn't changed
  if (settings.metadataId){
    try {
      var meta = Sheets.Spreadsheets.DeveloperMetadata.get (doc.getId() , settings.metadataId);
      var saved_sheet_id = meta.location.dimensionRange.sheetId.toString() || "0";
      var id_str_col_idx = meta.location.dimensionRange.startIndex;
      var id_str = sheet.getRange(1, id_str_col_idx+1).getValue();
      if (id_str !== 'id_str'){
        storeDocProp_('metadataId','');
        putDocumentCache(fnLabel, {stage: 'restart'});
        return collectionRun();
      }
    } catch(e) {
      // sheet probably deleted so remove metadataId
      storeDocProp_('metadataId','');
      putDocumentCache(fnLabel, {stage: 'restart-error'});
      return collectionRun();
    }
  }
  if (!settings.metadataId || saved_sheet_id !== settings.sheetId) {
    setupArchiveSheet_(doc, sheet, settings, action, fnLabel);
  }
  storeDocProp_('id_str_col_idx', id_str_col_idx);
  return true;
}

function deleteAllTriggers_(debug){
  if (!debug) {
    var triggers = ScriptApp.getUserTriggers(SpreadsheetApp.getActive());
    for (var t = 0; t < triggers.length; i++) {
      ScriptApp.deleteTrigger(triggers[t]);
    }
  }
  storeDocProp_('triggers','');
}

function setupArchiveSheet_(doc, sheet, settings, action, fnLabel){
  // if no metadata or sheet has changed
  putDocumentCache(fnLabel, {stage: 'setup'});
  var id_str = sheet.getRange(1, 1).getValue();
  // if r1c1 not id_str and sheet not empty
  if(id_str !== 'id_str' && !isSheetEmpty_(sheet)){
    if (!isSheetEmpty_(sheet)){
      
      return Browser.msgBox("The sheet '"+sheet.getName()+"' isn't empty or an existing TAGS archive with an id_str column. Please wipe this sheet or select another", 
        Browser.Buttons.OK);
    }
  } else if(id_str === 'id_str' && !action.import) {
    // there is an id_str so see if it should be imported for setup
    var import = Browser.msgBox("The sheet '"+sheet.getName()+"' looks like an old TAGS archive. Do you wish to use with the TAGS Add-on?", 
      Browser.Buttons.YES_NO);
    if (import === 'yes'){
      return {status: 'import'};  
    } else {
      return {status: 'no-import'};
    }
    
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
    
    formatSheet_(sheet);   
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
  
  // check headings match user selected
  // these are the heads
  var heads = sheet.getDataRange()
  .offset(0, 0, 1)
  .getValues()[0];
  var cols_arr = settings.columns.split(',')
  cols_arr.unshift('id_str');
  var new_cols_arr = cols_arr.filter(function(val) {
    return heads.indexOf(val) == -1;
  });
  if (new_cols_arr.length > 0){
    sheet.getRange(1, sheet.getLastColumn()+1, 1, new_cols_arr.length).setValues([new_cols_arr]);
    formatSheet_(sheet);
  }
}

function formatSheet_(sheet){
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

/**
 * Sets a static document property, using caching.
 * @param {string} key The property key.
 * @param {string | Object} value The property value.
 */
function storeDocProp_(key, value){
  if(Array.isArray(value)){
    value = value.join(','); 
  }
  //console.log({storeDocProp: key, value: value});
  PropertiesService.getDocumentProperties().setProperty(key, value);
  CacheService.getDocumentCache().put(key, value, 86400);
  CacheService.getDocumentCache().put('ALL', 
                                      JSON.stringify(PropertiesService.getDocumentProperties().getProperties()), 
                                      86400);
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
  console.log({getDocProp: key, value: value});
  return value;
}
/**
 * Gets all static document properties, using caching.
 * @returns {Object} The property values.
 */
function getDocProps_(){
  var value = JSON.parse(CacheService.getDocumentCache().get('ALL'));
  //console.log({getDocProps: 'ALL-cache', value: value});
  //console.log({getDocProps: 'ALL-getProperties', value: PropertiesService.getDocumentProperties().getProperties()});
  if (!value){
    var value = PropertiesService.getDocumentProperties().getProperties();
    //console.log({getDocProps: 'ALL-getProperties', value: value});
    CacheService.getDocumentCache().put('ALL', JSON.stringify(value), 86400);
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

/*
* Example function for Google Analytics Measurement Protocol.
* @param {Object} data for event to track
*/
function sendToGA(data){
  var base = {v:   '1',
              tid: 'UA-48225260-5',
              cid: Session.getTemporaryActiveUserKey(),
              t:   'event', 
              ec:  'TAGSAddon', 
              ea:  'Data Collection'};
  // https://stackoverflow.com/a/171256
  for (var a in base) { data[a] = base[a]; }
  var payload = Object.keys(data).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
  }).join('&');
  
  var options = {'method' : 'POST',
                 'payload' : payload };
  
  UrlFetchApp.fetch('https://www.google-analytics.com/collect', options); 
  console.log({call: 'GA', options: options});
}

