/**
* Get Tweets from API.
*
* @private
* @param {Object} params The query parameters.
* @param {string} type The type of API call to do.
*/
function getTweets_(settings, doc) {
  //var queryParams = getQueryParams_(params, type);
  var queryParams = {q: settings.tw_input,
                     count: 100,
                     result_type: 'recent',
                     include_entities: 1,
                     since_id: settings.since_id || 0
                    };
  // prepare search term
  if (settings.tw_period && settings.tw_period !== 'default'){
    var period = parseInt(settings.tw_period);
    var until=new Date();
    until.setDate(until.getDate()-period);
    queryParams.until = twDate_(until);
  }
  
  if (settings.tw_adv_params){
    var extraParams = JSON.parse(settings.tw_adv_params);
    // https://stackoverflow.com/a/171256
    for (var a in extraParams) { queryParams[a] = extraParams[a]; }
  }
  var numTweets = parseInt(settings.tw_num_of_tweets);
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
    console.log({call: 'search/tweets', queryParams: queryParams});
    while(!done){
      var responseData = get('search/tweets', queryParams);
      
      putDocumentCache('collectionRun', {stage: 'get-tweets',data:parseInt(page/maxPage*100)});
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
            data.push(flattenDataFast_(objects[i]));
          }
          queryParams.max_id = objects[objects.length-1]["id_str"];

        } else { // if not data break the loop
          Logger.log("no objects");
          done = true;
        }
        //doc.toast("Fetched "+data.length+" tweets", "TAGS");
        page ++;
        if (page > maxPage) done = true; // if collected 16 pages (the max) break the loop
      } 
    } //end of while loop
    GATracking.addToGA({t: 'event', ec: 'TAGSAddon', ea: 'Data Collection', el: 'Pages', ev:page});
    return removeDuplicates(data,'id_str');
  } catch (e) {
    Browser.msgBox("Line "+e.lineNumber+" "+e.message+e.name);
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