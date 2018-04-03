/**
* Get Tweets from API.
*
* @private
* @param {Object} params The query parameters.
* @param {string} type The type of API call to do.
*/
function getTweets_(settings, doc) {
  var endpoint = ENDPOINTS[settings.endpoint];
  var queryParams = JSON.stringify(endpoint.params);
  
  // add tw_input to params
  if (queryParams.indexOf('tw_input_parse') !== -1){
    // handle lists
    var paths = settings.tw_input.split('/');
    var listIdx = paths.indexOf('lists');
    queryParams = queryParams.replace('tw_input_parse_screen_name',paths[listIdx-1])
                             .replace('tw_input_parse_slug',paths[listIdx+1]);
  } else {
    // handle everything else
    queryParams = queryParams.replace('tw_input', escapeSpecialChars_(settings.tw_input));
  }
  queryParams = JSON.parse(queryParams);
  

  queryParams.since_id = settings.since_id || null;
  queryParams.cursor = settings.cursor || null;
  
  // if search prepare period if set
  if (settings.endpoint === 'search/tweets' && settings.tw_period && settings.tw_period !== 'default'){
    var period = parseInt(settings.tw_period);
    var until=new Date();
    until.setDate(until.getDate()-period);
    queryParams.until = twDate_(until);
  }
  
  // handle premium access
  if (settings.endpoint === 'tweets/search/:product/:label' || settings.endpoint === 'tweets/search/:product/:label/counts'){
    var user_settings = getUserProps_();
    settings.endpoint = settings.endpoint.replace(':product', user_settings.premium_product)
                                         .replace(':label', user_settings.premium_label);
    queryParams.next = settings.next || null;
    queryParams.fromDate = twPremiumDate_(settings.fromDate);
    queryParams.toDate = twPremiumDate_(settings.toDate);
    
    if (settings.endpoint === 'tweets/search/:product/:label/counts'){
      queryParams.bucket = settings.premium_bucket || endpoint.bucket;
    }
  }
  
  // add extra params to query
  if (settings.tw_adv_params){
    var extraParams = JSON.parse(settings.tw_adv_params);
    // https://stackoverflow.com/a/171256
    for (var a in extraParams) { queryParams[a] = extraParams[a]; }
  }
  
  
  //stripe any blank queryParams
  queryParams = removeEmpty_(queryParams);
  
  // calculate number of pages
  var numTweets = parseInt(settings.tw_num_of_tweets);
  var maxTweets = endpoint.max || endpoint.rate_limit * queryParams.count;
  if (numTweets > maxTweets)  numTweets = maxTweets;
  var perPage = queryParams.count || queryParams.maxResults;
  var maxPage = Math.ceil(numTweets/perPage);
  
  var data = [];
  var idx = 0;
  try {
    var max_id = "";
    var max_id_url = "";
    var page = 1;
    var done = false;
    var maxid_str = "";
    console.log({call: settings.endpoint, queryParams: queryParams});
    while(!done){
      var response = get(settings.endpoint, queryParams);
      
      putDocumentCache('collectionRun', {stage: 'get-tweets',data:parseInt(page/maxPage*100)});
      if (response.message){
        console.error("Error", response);
        handleError_(response, settings.endpoint);
        //Browser.msgBox("Error", response.message, Browser.Buttons.OK);
        done = true;
      } else {
        if (endpoint.dataPath){
          var objects = response[endpoint.dataPath];
        } else {
          var objects = response;
        }
        var objLen = objects.length
        if (objLen>0){ // if data returned
          
          for (var i=0; i < objLen; i++){
            //data.push(flatten(objects[i]));
            // if getting users and id_str already collected finish collection
            if (endpoint.dataPath === 'users' && settings.existing_ids_sample.indexOf(objects[i].id_str) > -1){
              done = true;
              updateMetadataCursor("-1");
              break;
            }
            data.push(flattenDataFast_(objects[i]));
          }
          
          if (endpoint.dataPath === 'users'){
            queryParams.cursor = response.next_cursor_str;
            if (queryParams.cursor === "0"){
              done = true;
              updateMetadataCursor("-1");
            }
            //updateMetadataCursor(queryParams.cursor);
          } else if (endpoint.dataPath === 'results') {
            if (response.next){
              queryParams.next = response.next;
            } else {
              done = true;
            }
          } else {
            if(response.search_metadata !== undefined) {
              if (response.search_metadata.max_id_str == objects[objLen-1]["id_str"]){
                done = true;
              }
            }
            queryParams.max_id = objects[objects.length-1]["id_str"];
          }

        } else { // if not data break the loop
          Logger.log("no objects");
          done = true;
        }
        //doc.toast("Fetched "+data.length+" tweets", "TAGS");
        page ++;
        if (page > maxPage) {
          if (queryParams.cursor){
            updateMetadataCursor(queryParams.cursor);
            showQuota({filter:settings.endpoint, error:'Quota has been reached. Collection will automatically resume in 15 minutes'});
            autoCollectSetup('resume');
          } 
          done = true; // if collected max pages break the loop
        }
      } 
    } //end of while loop
    GATracking.addToGA({t: 'event', ec: 'TAGSAddon', ea: settings.endpoint, el: 'Pages', ev:page});
    return removeDuplicates_(data,'id_str');
  } catch (e) {
    console.log({call:'getTweets', data: response});
    if (queryParams.cursor || queryParams.next){
      updateMetadataCursor(queryParams.cursor || queryParams.next);
    }
    handleError_(e, settings.endpoint);
    GATracking.addToGA({t: 'exception', exd: 'Line '+e.lineNumber+' '+e.message});
    GATracking.processGABatch();
    //Browser.msgBox("Line "+e.lineNumber+" "+e.message+e.name);
    return data;
  }
}

/**
* Formats date object for Twiiter API call.
*
* @param {Date} aDate Date object
* @return {string} Formatted date 
*/
function twDate_(aDate){
  return Utilities.formatDate(aDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

/**
* Formats unix date for Twiiter Premium API call.
*
* @param {string} unix_date to convert
* @return {string} Formatted date 
*/
function twPremiumDate_(unix_date){
 return Utilities.formatDate(new Date(parseInt(unix_date)), 
                                                Session.getScriptTimeZone(),
                                                'yyyyMMddhhmm')  || null; 
}