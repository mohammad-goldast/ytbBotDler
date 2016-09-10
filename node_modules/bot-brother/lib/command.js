(function() {
  var Command, _, mixins;

  _ = require('lodash');

  mixins = require('./mixins');

  Command = (function() {
    function Command(name, params) {
      this.bot = params.bot;
      if (_.isString(name)) {
        name = name.toLowerCase();
      }
      this.name = name;
      this.isDefault = params.isDefault;
      this.compliantKeyboard = params.compliantKeyboard;
    }

    Command.prototype.invoke = function(handler) {
      return this.use('invoke', handler);
    };

    Command.prototype.answer = function(handler) {
      return this.use('answer', handler);
    };

    Command.prototype.callback = function(handler) {
      return this.use('callback', handler);
    };

    return Command;

  })();

  _.extend(Command.prototype, mixins);

  module.exports = Command;

}).call(this);
