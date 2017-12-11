var script = {};

script.i18n = {};

script.i18n.getMessage = function(msg, lang){
  return i18n[msg][lang];
}

/**
 * Retrieves internationalized messages and loads them into the UI.
 * @private
 */
script.fillMessages_ = function() {
  // Load internationalized messages.
  $('.i18n').each(function() {
    var i18nText = script.i18n.getMessage($(this).attr('data-msg').toString(), 'en');
    if ($(this).prop('tagName') == 'IMG') {
      $(this).attr({'title': i18nText});
    } else {
      $(this).text(i18nText);
    }
  });
};

// Are we running in the context of the Options page? Or is this file being included so that
// the client can set and get options?
if (typeof jQuery !== 'undefined') {
  script.fillMessages_();
}