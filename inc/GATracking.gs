var GATracking = (function (ns) {
  
  // Globals
  var GA_BATCH = [];
  var TRACKING_KEY = 'GATracking_Pref';
  
  /*
  * Initialize with Google Analytics Tracking ID / Web Property ID.
  * @param {string} tid of Tracking ID / Web Property ID 
  * @param {string} optUID setting optional User ID 
  */
  ns.init = function (tid, optUID) {
    ns.setProp_('TID',tid);
    ns.setProp_('UID',optUID || '');
  };
  
  /*
  * Build data to send Google Analytics Measurement Protocol.
  * @param {Object} data for event to track
  */
  ns.addToGA = function (data){
    var base = {v:   '1',
                tid: ns.getProp_('TID'),
                uid: ns.getProp_('UID') || Session.getTemporaryActiveUserKey()};
    // merge data with base
    // https://stackoverflow.com/a/171256
    for (var a in base) { 
      data[a] = base[a]; 
    }
    // turn obejct into querystring
    var payload = Object.keys(data).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
    }).join('&');
    addToGABatch_(payload, new Date());
  }
  
  /*
  * Adds our GA call to a queue and sends when it hits 20
  * @param {string} query for event to track
  * @param {Date} date of event to track
  */
  function addToGABatch_(query, date){
    GA_BATCH.push({query: query, time:date});
    if (GA_BATCH.length >= 20){
      ns.processGABatch(); 
    }
  }
  
  /* 
  * Send data to GA via batch
  */
  ns.processGABatch = function (){
    // check tracking pref
    var no_tracking = ns.getNoTrackingPref();
    if (!no_tracking){
      var payload = "";
      var ga_now = new Date().getTime();
      // build payload
      for (var i=0; i < GA_BATCH.length; i++){
        payload += GA_BATCH[i].query + "&qt=" + (ga_now - GA_BATCH[i].time) + "\n";
      }
      var options = {'method' : 'POST',
                       'payload' : payload };
      var rep_code = UrlFetchApp.fetch('https://www.google-analytics.com/batch', options).getResponseCode();
      if (rep_code < 200 || rep_code > 299){
        console.error({call: 'GATracking', error:rep_code});
      }
      GA_BATCH = [];
    }
  }
  
  /**
  * Gets tracking pref using caching.
  * @returns {Boolean} tracking pref.
  */
  ns.getNoTrackingPref = function (){
    return ns.getProp_(TRACKING_KEY) == 'true'
  }
  
  /**
  * Sets tracking pref using caching.
  */
  ns.setNoTrackingPref = function(pref){
    ns.setProp_(TRACKING_KEY, pref);
  }
  
  /**
  * Sets a static user property, using caching.
  * @param {string} key The property key.
  * @param {string} value The property value.
  */
  ns.setProp_ = function (key, value){
    PropertiesService.getUserProperties().setProperty(key, value);
    CacheService.getUserCache().put(key, value, 86400);
  }
  
  /**
  * Gets a static document property, using caching.
  * @param {string} key The property key.
  * @returns {string} The property value.
  */
  ns.getProp_ = function(key){
    var value = CacheService.getUserCache().get(key);
    if (!value){
      var value = PropertiesService.getUserProperties().getProperty(key);
      CacheService.getUserCache().put(key, value, 86400);
    }
    return value;
  }
  return ns;
})(GATracking || {});
