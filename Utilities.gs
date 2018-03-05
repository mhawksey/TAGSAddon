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
        p['profile_image_url'] = ob.user.profile_image_url_https;
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
        p['entities_expanded_urls'] = (ob.entities.urls) ? keyGroup(ob.entities.urls,'expanded_url').join(',') : null;
        p['entities_hashtags'] = (ob.entities.hastags) ? keyGroup(ob.entities.hastags,'text').join(',') : null;
        p['entities_user_mentions'] = (ob.entities.user_mentions) ? keyGroup(ob.entities.user_mentions,'screen_name').join(',') : null;
        p['entities_media'] = (ob.entities.media) ? keyGroup(ob.entities.media,'media_url_https').join(',') : null;
        break;
      default:
        p[c.key] = c.value
    }
  });
  return p;
}

function validSheetMetadata_(doc, sheet, settings, endpoint, action, fnLabel){
  // if metadata check sheet id hasn't changed
  if (!settings.metadataId){
    return setupArchiveSheet_(doc, sheet, settings, endpoint, action, fnLabel)
  } else {
    try {
      var meta = Sheets.Spreadsheets.DeveloperMetadata.get (doc.getId() , settings.metadataId);
      var saved_sheet_id = meta.location.dimensionRange.sheetId.toString() || "0";
      var id_str_col_idx = meta.location.dimensionRange.startIndex;
      var metadataValue = JSON.parse(meta.metadataValue);
      var meta_endpoint = metadataValue.endpoint;
      var meta_cursor = metadataValue.cursor;
      
      if (settings.endpoint !== meta_endpoint || saved_sheet_id !== settings.sheetId){
        setDocProp_('metadataId','');
        putDocumentCache(fnLabel, {stage: 'restart'});
        return setupArchiveSheet_(doc, sheet, settings, endpoint, action, fnLabel);
      }
    } catch(e) {
      // sheet probably deleted so remove metadataId
      setDocProp_('metadataId','');
      putDocumentCache(fnLabel, {stage: 'restart-error'});
      return setupArchiveSheet_(doc, sheet, settings, endpoint, action, fnLabel);
    }
  }
  var meta_result = {id_str_col_idx: parseInt(id_str_col_idx)};
  
  if (endpoint.dataPath === 'users'){
    meta_result.cursor = meta_cursor
  } 
  return meta_result;
}

function updateMetadataCursor(cursor){
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getDocProps_();
  var requests = [{
    updateDeveloperMetadata: {
      dataFilters:[{
        developerMetadataLookup: {
          metadataId: settings.metadataId
        }}],
      developerMetadata:{
        metadataValue:JSON.stringify({
          writtenBy:Session.getActiveUser().getEmail(),
          createdAt:new Date().getTime(),
          endpoint: settings.endpoint,
          cursor: cursor
        })
      },
      fields:'metadataValue',
    }
  }];
  var meta = Sheets.Spreadsheets.batchUpdate({requests:requests},doc.getId());
  console.log({call: 'updateMetadataCursor', data: meta});
}

function setupArchiveSheet_(doc, sheet, settings, endpoint, action, fnLabel){
  // if no metadata or sheet has changed
  putDocumentCache(fnLabel, {stage: 'setup'});
  var id_str = sheet.getRange(1, 1).getValue();
  // if r1c1 not id_str and sheet not empty
  if(id_str !== 'id_str' && !isSheetEmpty_(sheet)){
    if (!isSheetEmpty_(sheet)){
      
      return Browser.msgBox("The sheet '"+sheet.getName()+"' isn't empty or an existing TAGS archive with an id_str column. Please wipe this sheet or select another", 
        Browser.Buttons.OK);
    }
  } else if(id_str === 'id_str') {
    // there is an id_str so see if it should be imported for setup
    var import = Browser.msgBox("The sheet '"+sheet.getName()+"' looks like an old TAGS archive. Do you wish to use with the TAGS Add-on?", 
      Browser.Buttons.YES_NO);
    if (import === 'yes'){ 
      action.import = true;
    } else {
      return {status: 'no-import'};
    }
    
  } 
  // at this point sheet is either empty or has an old archive so write the metadata
  if (!action.import){
    // if not importing TAGS setup the archive sheet
    // created header
    
    
    // if not a users import add an id_str column
    if (endpoint.dataPath !== 'users'){
      var cols_arr = settings.status_columns.split(',');
    } else {
      var cols_arr = settings.users_columns.split(',');
    }
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
          createdAt:new Date().getTime(),
          endpoint: settings.endpoint,
          cursor: '-1'
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
  setDocProp_('metadataId',settings.metadataId);
  //setDocProp_('id_str_col_idx', 0);
  
  // check headings match user selected
  // these are the heads
  var heads = sheet.getDataRange()
                   .offset(0, 0, 1)
                   .getValues()[0];
  var cols_arr = settings.status_columns.split(',');
  // if not a users import add an id_str column
  if (endpoint.dataPath !== 'users'){
    cols_arr.unshift('id_str');
  }
  var new_cols_arr = cols_arr.filter(function(val) {
    return heads.indexOf(val) == -1;
  });
  if (new_cols_arr.length > 0){
    sheet.getRange(1, sheet.getLastColumn()+1, 1, new_cols_arr.length).setValues([new_cols_arr]);
    formatSheet_(sheet);
  }
  validSheetMetadata_(doc, sheet, settings, endpoint, action, fnLabel);
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

function deleteAllTriggers_(debug){
  if (!debug) {
    var triggers = ScriptApp.getUserTriggers(SpreadsheetApp.getActive());
    for (var t = 0; t < triggers.length; i++) {
      ScriptApp.deleteTrigger(triggers[t]);
    }
  }
  setDocProp_('triggers','');
}

function setRowsData_(sheet, data, optStartRow){
  var startRow = optStartRow || 2
 // these are the heads
  var heads = sheet.getDataRange()
                   .offset(0, 0, 1)
                   .getValues()[0];
  
  sheet.insertRowsAfter(startRow-1, data.length);
  
  // convert object data into a 2d array 
  var tr = data.map (function (row) {
    return heads.map(function(cell){
      return row[cell] || "";
    });
  });
  sheet.getRange(startRow, 1, tr.length, tr[0].length).setValues(tr);
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
function removeDuplicates_( arr, prop ) {
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
function setDocProp_(key, value){
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
function setUserProp_(key, value){
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
  //console.log({getDocProp: key, value: value});
  return value;
}
/**
 * Gets all static document properties, using caching.
 * @returns {Object} The property values.
 */
function getDocProps_(){
  var value = JSON.parse(CacheService.getDocumentCache().get('ALL'));
  if (!value){
    var value = PropertiesService.getDocumentProperties().getProperties();
    CacheService.getDocumentCache().put('ALL', JSON.stringify(value), 86400);
  }
  console.log({getDocProps: 'ALL-cache', value: value});
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

function escapeSpecialChars_(str) {
  return str.replace(/[\\]/g, '\\\\')
            .replace(/[\"]/g, '\\\"')
            .replace(/[\/]/g, '\\/')
            .replace(/[\b]/g, '\\b')
            .replace(/[\f]/g, '\\f')
            .replace(/[\n]/g, '\\n')
            .replace(/[\r]/g, '\\r')
            .replace(/[\t]/g, '\\t');
};

//https://stackoverflow.com/a/38340730
function removeEmpty_(obj) {
  Object.keys(obj).forEach(function(key) {
    (obj[key] && typeof obj[key] === 'object') && removeEmpty(obj[key]) ||
    (obj[key] === undefined || obj[key] === null) && delete obj[key]
  });
  return obj;
};


//https://stackoverflow.com/a/9345181
function postfixNum_(n,d){
  x=(''+n).length,p=Math.pow,d=p(10,d)
  x-=x%3
  return Math.round(n*d/p(10,x))/d+" kMGTPE"[x/3]
}

function keyGroup(arr, key){
  return arr.map(function(elem) {
    return elem[key];
  });
}

function handleError_(e, endpoint){
  var error_str = e.message.match(/({.*})/);
  if (error_str){
    var err = JSON.parse(error_str[1]);
    if (err.errors[0].code == 88){
      showQuota({filter:endpoint, error:err.errors[0].message});
    }
  } else {
   Browser.msgBox("Line "+e.lineNumber+" "+e.message+e.name); 
  }
}

