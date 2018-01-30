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
      $(this).html(i18nText);
    }
  });
};

script.settingsSave = function(type, context) {
  $('.settings').each(function(index) {
      var elType = this.type || this.tagName.toLowerCase();
      google.script.run.withSuccessHandler(script.handleSettings)
        .getSettings($(this).attr('id'), type, elType);
      SETTINGS_COUNT++;

      // handle on change 
      $(this).on('propertychange change click keyup input paste', function(e) {
        var setObj = {};
        if (elType === 'checkbox'){
          var val = $(this).is(':checked');
        } else {
          var val = $(this).val();
        }
        setObj[$(this).attr('id')] = val;
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
  console.log(setting);
  SETTINGS_COUNT--;
  //if (setting.value !== '') {
    switch (setting.type) {
      case 'select-one':
        if (setting.value){
          $('#' + setting.id + ' option[value="' + setting.value + '"]').prop('selected', 'selected');
          $('select').material_select();
        }
        break;
      case 'text':
        $('#' + setting.id).val(setting.value);
        break;
      case 'hidden':
        $('#' + setting.id).val(setting.value);
        // date/time pickers
        var $input = $('#' + setting.id + '_in').pickadate({
          selectMonths: true, // Creates a dropdown to control month
          selectYears: 15, // Creates a dropdown of 15 years to control year,
          today: false,
          clear: 'Clear',
          close: 'Ok',
          closeOnSelect: true, // Close upon selecting a date,
          onSet: function(val) {
            $('#' + setting.id).val(val.select || '')
                               .trigger('change');
          }
        });
        if (setting.value){
          // Use the picker object directly.
          var picker = $input.pickadate('picker');
          picker.set('select', parseInt(setting.value));
        }
        break;
      case 'range':
        $('#' + setting.id).val(setting.value);
        break;
      case 'select-multiple':
        $('#' + setting.id).val(setting.value.split(',')).trigger("change");
        break;
      case 'checkbox':
        //if (setting.value === 'true'){
          $('#' + setting.id).prop('checked', (setting.value == 'true'));
        //}
    }
  //}
  Materialize.updateTextFields();
  //script.doKeySecretHandling();
  if (SETTINGS_COUNT === 0){
    $('#loader').hide();
    $('#container').show();
    $('ul.tabs').tabs();
  }
}

// http://ramblings.mcpher.com/Home/excelquirks/gassnips/exposeserver
function expose (namespace , method) {
   return this[namespace][method]
  .apply(this,Array.prototype.slice.call(arguments,2));
}

// Are we running in the context of the Options page? Or is this file being included so that
// the client can set and get options?
if (typeof jQuery !== 'undefined') {
  script.fillMessages_();
}