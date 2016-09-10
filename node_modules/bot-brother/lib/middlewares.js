(function() {
  var botanio;

  botanio = require('botanio');

  module.exports.botanio = function(key) {
    var botan;
    botan = botanio(key);
    return function(context) {
      var callbackQuery, command, inlineQuery, message;
      if (!context.isBotanioTracked && context.type !== 'synthetic' && !context.isRedirected) {
        context.isBotanioTracked = true;
        message = context.message, inlineQuery = context.inlineQuery, callbackQuery = context.callbackQuery, command = context.command;
        botan.track(message || inlineQuery || callbackQuery, command.name);
      }
    };
  };

  module.exports.typing = function() {
    return function(context) {
      if (context.message && context.type !== 'callback') {
        context.bot.api.sendChatAction(context.meta.chat.id, 'typing');
      }
    };
  };

}).call(this);
