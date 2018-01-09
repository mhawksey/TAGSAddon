var SETTINGS_COUNT = 0;
var script = {};

script.i18n = {};

script.i18n.getMessage = function(msg, optLang){
  var lang = optLang || "en";
  return i18n[msg][lang];
}

/**
 * Retrieves internationalized messages and loads them into the UI.
 * @private
 */
script.fillMessages_ = function(optLang) {
  var lang = optLang || 'en';
  // Load internationalized messages.
  $('.i18n').each(function() {
    var i18nText = script.i18n.getMessage($(this).attr('data-msg').toString(), lang);
    if ($(this).prop('tagName') == 'IMG') {
      $(this).attr({'title': i18nText});
    } else {
      $(this).text(i18nText);
    }
  });
};

script.settingsSave = function(type, context) {
  $('.settings').each(function(index) {
      google.script.run.withSuccessHandler(script.handleSettings)
        .getSettings($(this).attr('id'), type, this.type || this.tagName.toLowerCase());
      SETTINGS_COUNT++;

      // handle on change 
      $(this).on('input, change', function(e) {
        var setObj = {};
        setObj[$(this).attr('id')] = $(this).val();
        google.script.run.storeSettings(setObj, type);
        if (context === 'setup'){
          script.doKeySecretHandling();
        }
      });  
    });
}

script.doKeySecretHandling = function(){
  // key/secret handling
      //$('#signin').prop("disabled", false);
      if ($('#consumer_key').val() !== "" && $('#consumer_secret').val() !== "") {
          $('#signin').prop("disabled", false);
          google.script.run.withSuccessHandler(function(r) {
              if (r) {
                authUrl = r;
              }
            })
            .getAuthorizationUrl()
        } else {
          $('#signin').prop("disabled", true);
        }
}


script.handleSettings = function(setting) {
  SETTINGS_COUNT--;
  if (setting.value !== '') {
    switch (setting.type) {
      case 'select-one':
        $('#' + setting.id + ' option[value=' + setting.value + ']').prop('selected', 'selected');
        $('select').material_select();
        break;
      case 'text':
        $('#' + setting.id).val(setting.value);
        break;
      case 'range':
        $('#' + setting.id).val(setting.value);
        break;
      case 'select-multiple':
        $('#' + setting.id).val(setting.value.split(',')).trigger("change");
        break;
    }
  }
  Materialize.updateTextFields();
  //script.doKeySecretHandling();
  if (SETTINGS_COUNT === 0){
    $('#loader').hide();
    $('#container').show();
    $('ul.tabs').tabs();
  }
  
}

// Are we running in the context of the Options page? Or is this file being included so that
// the client can set and get options?
if (typeof jQuery !== 'undefined') {
  script.fillMessages_();
}