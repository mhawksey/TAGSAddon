var GATracking = (function (ns) {
  
  var GA_BATCH = [];
  var TRACKING_KEY = 'GATracking_Pref'
  var TID = ''
  
  /*
  * Initialize with Google Analytics Tracking ID / Web Property ID.
  * @param {string} tid of Tracking ID / Web Property ID 
  */
  ns.init = function (tid) {
    TID = tid;
  };
  
  /*
  * Build data to send Google Analytics Measurement Protocol.
  * @param {Object} data for event to track
  */
  ns.addToGA = function (data){
    var base = {v:   '1',
                tid: TID,
                uid: Session.getTemporaryActiveUserKey()};
    // https://stackoverflow.com/a/171256
    for (var a in base) { data[a] = base[a]; }
    var payload = Object.keys(data).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
    }).join('&');
    
    addToGABatch_(payload, new Date());
  }
  
  /*
  * Adds our GA call to a queue and sends when it hits 20
  * @param {string} data for event to track
  * @param {Date} date of event to track
  */
  function addToGABatch_(query, time){
    GA_BATCH.push({query: query, time:time});
    if (GA_BATCH.length >= 20){
      ns.processGABatch(); 
    }
  }
  
  /* 
  * Send data to GA via batch
  */
  ns.processGABatch = function (){
    var no_tracking = ns.getNoTrackingPref();
    if (!no_tracking){
      var payload = "";
      var ga_now = new Date().getTime();
      for (var i=0; i < GA_BATCH.length; i++){
        payload += GA_BATCH[i].query + "&qt=" + (ga_now - GA_BATCH[i].time) + "\n";
      }
      try {
        var options = {'method' : 'POST',
                       'payload' : payload };
        UrlFetchApp.fetch('https://www.google-analytics.com/batch', options);
        GA_BATCH = [];
      } catch(e) {
        console.error({call: 'GATracking', error:e});
      }
    }
  }
  
  /**
  * Gets tracking pref using caching.
  * @returns {Boolean} tracking pref.
  */
  ns.getNoTrackingPref = function (){
    var value = CacheService.getUserCache().get(TRACKING_KEY);
    if (!value){
      var value = PropertiesService.getUserProperties().getProperty(TRACKING_KEY);
      CacheService.getUserCache().put(TRACKING_KEY, value, 86400);
    }
    return value == 'true';
  }
  
  /**
  * Sets tracking pref using caching.
  */
  ns.setNoTrackingPref = function(pref){
    PropertiesService.getUserProperties().setProperty(TRACKING_KEY, pref);
    CacheService.getUserCache().put(TRACKING_KEY, pref, 86400);
    console.log({call: 'setNoTrackingPref', data: pref});
  }
  return ns;
})(GATracking || {});

/**
 * Set opt out of GA tracking.
 */
function trackingOptOut(){
  GATracking.setNoTrackingPref('true');
}

function test(){
  GATracking.init('UA-48225260-5');
  GATracking.setNoTrackingPref('false')
  GATracking.addToGA({foo:'bar'});
  GATracking.addToGA({foo:'bar2'});
  GATracking.processGABatch();
}
