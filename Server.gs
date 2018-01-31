function collectionRun(action) {
  var startTime = new Date();
  var fnLabel = 'collectionRun';
  console.time(fnLabel);
  putDocumentCache(fnLabel, {stage: 'start'});
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
  
  if (!validSheetMetadata_(doc, sheet, settings, action, fnLabel)){
    setupArchiveSheet_(doc, sheet, settings, action, fnLabel)
  }
  
  var id_str_col_idx = parseInt(getDocProp_('id_str_col_idx')) || 0;
  
  // getting data part
  var since_id = 0;
  // find first id_str value
  var id_strs = sheet.getRange(2, id_str_col_idx+1, settings.tw_num_of_tweets).getValues();
  for (r in id_strs){
    if (id_strs[r][0] !== ""){
      settings.since_id = id_strs[r][0];
      break;
    }
  }
  putDocumentCache(fnLabel, {stage: 'getting-data'});
  //doc.toast("Getting data...", "TAGS");
  var data = getTweets_(settings, doc);
  // if some data insert rows
  if (data.length>0){
    doc.toast("Inserting "+data.length+" tweets", "TAGS");
    putDocumentCache(fnLabel, {stage: 'inserting-data',data:data.length});
    sheet.insertRowsAfter(1, data.length);
    setRowsData_(sheet, data);
    sheet.getRange(2, 1, data.length, sheet.getMaxColumns()).setFontWeight(null);
  }  
  var endTime = new Date();
  console.timeEnd(fnLabel);
  var dur = (endTime.getTime()/1000-startTime.getTime()/1000).toFixed(3);
  //doc.toast("Time taken "+((endTime.getTime()/1000-startTime.getTime()/1000).toFixed(3))+"s", "TAGS");
  putDocumentCache(fnLabel, {stage: 'finished',data:dur});
  GATracking.addToGA({t: 'event', ec: 'TAGSAddon', ea: 'Data Collection', el: 'Tweets', ev:data.length});
  endTime = Utilities.formatDate(endTime, Session.getScriptTimeZone(), 'yyy-MM-dd HH:mm:ss');
  setDocProp_('last_run', endTime);
  GATracking.processGABatch();
  return {status: 'finished', result: {tweets:data.length, run: endTime }};  
}

function autoCollectSetup(action){
  var doc = SpreadsheetApp.getActive();
  var created_trigs = [];
  var fnLabel = 'autoCollectSetup';
  putDocumentCache(fnLabel, {stage: 'start'});
  if (action == 'Stop'){
    deleteAllTriggers_();
    doc.toast("Auto-Collect stopped", "TAGS");
  } else {
    var settings = getDocProps_();
    // if existing triggers remove them
    if (settings.triggers){
      deleteAllTriggers_();
    }
    // handle auto collect trigger setup
    if (settings.update_frequency !== ''){
      // if no frequency set defualt to 1 hr
      setDocProp_('update_frequency','hourly');
      settings.update_frequency = 'hourly';
    } 
    
    created_trigs.push(settings.update_frequency);
    
    var refresh_trig = ScriptApp.newTrigger(collectionRun)
                                .timeBased();
    switch (settings.update_frequency){
      case '15mins':
        refresh_trig.everyMinutes(15);
        break;
      case '30mins':
        refresh_trig.everyMinutes(30);
        break;
      case 'hourly':
        refresh_trig.everyHours(1);
        break;
      case 'daily':
        refresh_trig.everyDays(1);
        break;
      case 'weekly':
        refresh_trig.everyWeeks(1);
        break;
      default:
        refresh_trig.everyHours(1);
    }
    created_trigs.push(refresh_trig.create().getUniqueId());
    
    // if a stop has been requested add it
    if (settings.end_collect_date){
      
      var stop_date = new Date(parseInt(settings.end_collect_date));
      if (stop_date > new Date()){
        var stop_trig = ScriptApp.newTrigger(deleteAllTriggers_)
                                 .timeBased()
                                 .at(stop_date)
                                 .create();
        created_trigs.push(stop_trig.getUniqueId());
      } else {
        deleteAllTriggers_();
        created_trigs = [];
      }
    }
    setDocProp_('triggers',created_trigs);
    doc.toast("Auto-Collect started", "TAGS");
  }
  putDocumentCache(fnLabel, {stage: 'finished'});
  return {status: 'finished', data:created_trigs.length};
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
      setDocProp_(Object.keys(settings)[0], 
                 settings[Object.keys(settings)[0]]);
      break;
    case 'user':
      
      setUserProp_(Object.keys(settings)[0], 
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
 * Get document cache.
 * @param {string} key of Cached object.
 * @return {Object} cached response.
 */
function getDocumentCache(key){
 return JSON.parse(CacheService.getDocumentCache().get(key));
}

/**
 * Put document cache.
 * @param {string} key of Cached object.
 * @param {Object} value to Cache.
 */
function putDocumentCache(key, value){
 CacheService.getDocumentCache().put(key, JSON.stringify(value), 2);
}

/**
 * Set opt out of GA tracking.
 */
function trackingOptOut(){
 setUserProp_('no_tracking', true);
}

/**
 * Get Last run date.
 */
function lastRun(){
 return getDocProp_('last_run');
}