function flattenDataFast(ob){
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

/**
* Wipes the archive sheet apart from header row
*/
function wipeArchive(){
  var result = Browser.msgBox("Warning!", 
                              "You are about to wipe this sheet\\n\\nDo you want to continue?", 
                              Browser.Buttons.YES_NO);
  // Process the user's response.
  if (result == 'yes') {
    var sheet = SpreadsheetApp.getActiveSheet()
    sheet.deleteRows(2, sheet.getLastRow()-1);
    showSidebarCollection();
  } 
}

function getFlattenedCols_(){
  var ob = get('search/tweets', {q:'#altc',count:100}).statuses;
  var out = {};
  for (s in ob){
    var dotJob = objectDash (ob[s]).reduce(function(p,c){
      p[c.key] = c.value;
      return p;
    },{});
    for (k in dotJob){ 
      out[k] = 1;
    };
  }
  return JSON.stringify(out);
}

function flattenData(ob){
  return objectDash(ob).reduce(function(p,c){
    if (c.key.indexOf('entities_') === -1){
      p[c.key] = c.value;
    }
    // legacy data handling
    switch(c.key){
      case 'user_url':
        if (c.value !== null){
          p[c.key] = ob.user.entities.url.urls[0].expanded_url
        }
        break;
      case 'user_screen_name':
        p['from_user'] = c.value;
        p['status_url'] = 'http://twitter.com/'+c.value+"/statuses/"+ob.id_str;
        break;
      case 'user_id_str':
        p['from_user_id_str'] = c.value;
        break;
      case 'user_profile_image_url_https':
        p['profile_image_url'] = c.value;
        break;
      case 'full_text':
        if (!ob.retweeted_status){
          p['text'] = ob.full_text
        } else {
          p['text'] = "RT @"+ob.retweeted_status.user.screen_name+": "+ob.retweeted_status.full_text;
        }
        break;
      case 'created_at':
        p['time'] = new Date(c.value);
        p['entities_str'] = JSON.stringify(ob.entities);
        break;
    }
    
    return p;
    
  },{});
}


// http://ramblings.mcpher.com/Home/excelquirks/gassnips/dotsyntax
function objectSplitKeys (ob,obArray,keyArray) {
  obArray = obArray || [];

  //turns this {a:1,b:2,c:{d:3,e:{f:25}}}
  // into this, so that the keys can be joined to make dot syntax
  //[{key:[a], value:1},{key:[b], value:2} , {key:[c,d], value:3}, {key:[c,e,f], value:25}]
  
  if (isObject(ob)) {
    Object.keys(ob).forEach ( function (k) {
      var ka = keyArray ? keyArray.slice(0) : [];
      ka.push(k);
      
      if(isObject(ob[k])) {
        objectSplitKeys (ob[k],obArray,ka);
      }
      else {
        obArray.push ( {key:ka, value:ob[k]} );
      }
      
    });
  }
  else {
    obArray.push(ob);
  }
  
  return obArray;
}
function isObject (obj) {
  return obj === Object(obj);
} 

function objectDash(ob) {
  return objectSplitKeys (ob).map ( function (o) {
     return {key:o.key.join("_"), value:o.value};
  });
}
