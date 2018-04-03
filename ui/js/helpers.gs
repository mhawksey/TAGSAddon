var SETTINGS_COUNT = 0;
var Script = {};

Script.i18n = {};

Script.i18n.getMessage = function(msg, optLang){
  var lang = optLang || "en";
  return i18n[msg][lang];
}

/**
 * Retrieves internationalized messages and loads them into the UI.
 * @private
 */
Script.fillMessages_ = function(optLang) {
  var lang = optLang || 'en';
  // Load internationalized messages.
  $('.i18n').each(function() {
    var i18nText = Script.i18n.getMessage($(this).attr('data-msg').toString(), lang);
    if ($(this).prop('tagName') == 'IMG') {
      $(this).attr({'title': i18nText});
    } else {
      $(this).html(i18nText);
    }
  });
};

Script.settingsSave = function(type, context) {
  $('.settings').each(function(index) {
      var elType = this.type || this.tagName.toLowerCase();
    
      /*google.script.run.withSuccessHandler(Script.handleSettings)
        .getSettings($(this).attr('id'), type, elType);
      SETTINGS_COUNT++;*/

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
          Script.doKeySecretHandling();
        }
      });  
    });
}

Script.doKeySecretHandling = function(){
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
Script.init = function(type, context){
  google.script.run.withSuccessHandler(Script.handleAllSettings)
        .getAllSettings(type);
  Script.settingsSave(type, context);
}

Script.handleAllSettings = function(settings) {
  console.log('Loading settings...');
      var $input = $('[id^=pick_]').pickadate({
            selectMonths: true, // Creates a dropdown to control month
            selectYears: 15, // Creates a dropdown of 15 years to control year,
            today: false,
            clear: 'Clear',
            close: 'Ok',
            closeOnSelect: true, // Close upon selecting a date,
            onSet: function(val) {
              var hiddenFieldName = this.$node[0].id.replace('pick_',''); 
              $('#'+hiddenFieldName).val(val.select || '')
                                    .trigger('change');
            }
          });
  Object.keys(settings).map(function(el){
    var input = $('#'+el+'.settings');
    if (input.length){
      var field = $('#' + el);
      var fieldType = field[0].type || field[0].tagName.toLowerCase();
      var fieldValue = settings[el];
      console.log({field: el, fieldType:fieldType, value:fieldValue});
      switch (fieldType) {
        case 'select-one':
          if (fieldValue){
            $('#' + el + ' option[value="' + fieldValue + '"]').prop('selected', 'selected');
            $('select').material_select();
            if (el === 'endpoint'){
              $('#endpoint').trigger('change');
            }
          }
          break;
        case 'text':
          field.val(fieldValue);
          break;
        case 'hidden':
          field.val(fieldValue);
          
          if (fieldValue){
            // Use the picker object directly.
            var picker = $('#pick_'+el).pickadate('picker');
            picker.set('select', parseInt(fieldValue));
          }
          break;
        case 'range':
          field.val(fieldValue);
          break;
        case 'select-multiple':
          field.val(fieldValue.split(',')).trigger("change");
          break;
        case 'checkbox':
          field.prop('checked', (fieldValue == 'true'));
      }
      
    }  
  });
  Materialize.updateTextFields();
  $('#loader').hide();
  $('#container').show();
  $('ul.tabs').tabs();
}

// http://ramblings.mcpher.com/Home/excelquirks/gassnips/exposeserver
function expose (namespace , method) {
   return this[namespace][method]
  .apply(this,Array.prototype.slice.call(arguments,2));
}

// Are we running in the context of the Options page? Or is this file being included so that
// the client can set and get options?
if (typeof jQuery !== 'undefined') {
  Script.fillMessages_();
  //Script.init();
}