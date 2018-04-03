function collectionRun(action) {
  var startTime = new Date();
  var fnLabel = 'collectionRun';
  console.time(fnLabel);
  putDocumentCache(fnLabel, {stage: 'start'});
  var action = action || {};
  // get existing settings
  var settings = getDocProps_();
  var endpoint = ENDPOINTS[settings.endpoint]
  var doc = SpreadsheetApp.getActive();
  var sheets = doc.getSheets();
  // get sheet object from sidebar selection
  for(var n in sheets){ // iterate all sheets and compare ids
    if(sheets[n].getSheetId()==settings.sheetId){break}
  }
  var sheet = sheets[n];
  var startRow = 2;
  var meta = validSheetMetadata_(doc, sheet, settings, endpoint, action, fnLabel);
  var id_strs = sheet.getRange(2, meta.id_str_col_idx+1, settings.tw_num_of_tweets).getValues();
  
  
  if (endpoint.dataPath !== 'users' && endpoint.dataPath !== 'results'){
    // getting data part
    var since_id = 0;
    // find first id_str value
    for (r in id_strs){
      if (id_strs[r][0] !== ""){
        settings.since_id = id_strs[r][0];
        break;
      }
    }
  } else if (endpoint.dataPath !== 'results') {
    // premium api 
    settings.next = meta.cursor;
  } else {
    var existing_ids_sample = [];
    // updating an existing user list 
    for (r in id_strs){
      if (id_strs[r][0] !== ""){
        existing_ids_sample.push(id_strs[r][0]);
      }
      if (existing_ids_sample.length > 10){
        break; 
      }
    }
    settings.existing_ids_sample = existing_ids_sample; 
    // building a complete list
    settings.cursor = meta.cursor;
    if (meta.cursor !== "-1"){
      startRow = sheet.getLastRow()+1;
    }
  }
  putDocumentCache(fnLabel, {stage: 'getting-data'});
  doc.toast("Getting data...", "TAGS");
  var data = getTweets_(settings, doc);
  // if some data insert rows
  if (data.length>0){
    // if auto export copy existing data to other sheet
    if (endpoint.dataPath !== 'users' && settings.auto_export && (sheet.getLastRow() + data.length) > parseInt(settings.auto_export_num)*1000){
      doc.toast("Exporting existing data to insert "+data.length+" rows", "TAGS - Full Sheet");
      var name = doc.getName() + ' Export ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
      
      var newDoc = SpreadsheetApp.create(name, sheet.getMaxRows(), sheet.getLastColumn());
      sheet.copyTo(newDoc);
      newDoc.deleteSheet(newDoc.getSheets()[0])
      sheet.deleteRows(2, sheet.getLastRow()-1);
    }
    doc.toast("Inserting "+data.length+" rows", "TAGS");
    putDocumentCache(fnLabel, {stage: 'inserting-data',data:data.length});
    //sheet.insertRowsAfter(1, data.length);
    setRowsData_(sheet, data, startRow);
    sheet.getRange(2, 1, data.length, sheet.getMaxColumns()).setFontWeight(null);
  }  
  var endTime = new Date();
  console.timeEnd(fnLabel);
  var dur = endTime.getTime()-startTime.getTime();
  GATracking.addToGA({t: 'timing', utc:'TAGSAddon', utv:'runtime', utl:'collectionRun', utt: dur});
  //doc.toast("Time taken "+((endTime.getTime()/1000-startTime.getTime()/1000).toFixed(3))+"s", "TAGS");
  putDocumentCache(fnLabel, {stage: 'finished',data:(dur/1000).toFixed(3)});
  GATracking.addToGA({t: 'event', ec: 'TAGSAddon', ea: settings.endpoint, el: 'Tweets', ev:data.length});
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
  if (action === 'Stop'){
    deleteAllTriggers_();
    doc.toast("Auto-Collect stopped", "TAGS");
  } else {
    var settings = getDocProps_();
    // if existing triggers remove them
    if (settings.triggers){
      deleteAllTriggers_();
    }
    // handle auto collect trigger setup
    if (action === 'resume'){
      // if resuming set to 15mins
      setDocProp_('update_frequency','15mins');
      settings.update_frequency = '15mins';
    } else if (settings.update_frequency !== ''){
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
 * Get settings for index.html.
 * @param {string} type of Properties Service.
 * @param {Object} settings.
 */
function getAllSettings(type){
  switch (type){
    case 'doc':
      return getDocProps_();
      break;
    case 'user':
      return getUserProps_();
      break;
  }
}

/**
 * Get current rate quotas from Twitter.
 * @return {Object} rate limits and renew times.
 */
function testRateLimit(options){
  var options = options || {};
  var endpoints = (options.filter) ? options.filter.split('/')[0] : 'search,statuses,friends,followers,favorites,lists';
  var data = get("application/rate_limit_status", {'resources': endpoints});
  var results = {}
  if (data.resources){
    var ends = endpoints.split(',');
    var items = [];
    for (key in ENDPOINTS){
      var res_id = key.split('/')[0];
      if (data.resources[res_id]){
        var res = data.resources[res_id]['/'+key];
        var now = new Date();
        var renew = new Date(res.reset*1000);
        var delta = Math.abs(renew - now)/1000;
        var minutes = Math.floor(delta / 60) % 60;
        var count = ENDPOINTS[key].params.count;
        var quota = Math.min(res.limit*count,50000)
        var hits_left = quota - (res.limit - res.remaining)*count
        var perc = parseInt(hits_left/quota*100)
        
        items.push({endpoint:ENDPOINTS[key].label, 
                    perc: perc,
                    hits_left: postfixNum_(hits_left, 2),
                    hits_renewed: minutes,
                    data:res});
      }
    }
    return {error: options.error, items: items}; 
  }
}

/**
 * Get document cache.
 * @param {string} key of Cached object.
 * @return {Object} cached response.
 */
function getDocumentCache(key){
 return JSON.parse(CacheService.getDocumentCache().get(key)) || false;
}

/**
 * Put document cache.
 * @param {string} key of Cached object.
 * @param {Object} value to Cache.
 */
function putDocumentCache(key, value){
  console.log('putDocumentCache', {key:key, value:value});
  CacheService.getDocumentCache().put(key, JSON.stringify(value), 5);
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