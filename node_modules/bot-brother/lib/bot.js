(function() {
  var Api, Bot, Command, CommandHandler, _, co, constants, mixins, promise, redis, sessionManager, utils,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Command = require('./command');

  CommandHandler = require('./command-handler');

  sessionManager = require('./session-manager');

  constants = require('./constants');

  mixins = require('./mixins');

  utils = require('./utils');

  _ = require('lodash');

  redis = require('redis');

  promise = require('bluebird');

  Api = require('node-telegram-bot-api');

  co = require('co');


  /*
  Bot class
  
  @property {String} key bot telegram key
  @property {Number} id bot id
  @property {Object} api telegram bot api
   */

  Bot = (function() {
    Bot.prototype.defaultConfig = {
      rps: 30,
      sessionManager: sessionManager.memory()
    };


    /*
    @param {Object} config config
    @option config {String} key telegram bot token
    @option config {Object} [redis] redis config; see https://github.com/NodeRedis/node_redis#options-is-an-object-with-the-following-possible-properties
    @option config {Object} [redis.client] redis client
    @option config {Boolean} [polling] enable polling
    @option config {Object} [webHook] config for webhook
    @option config {String} [webHook.url] webook url
    @option config {String} [webHook.key] PEM private key to webHook server
    @option config {String} [webHook.cert] PEM certificate key to webHook server
    @option config {Number} [webHook.port] port for node.js server
    @option config {Boolean} [webHook.https] create secure node.js server
    @option config {Number} [rps=30] Maximum requests per second
     */

    function Bot(config) {
      this._onCallbackQuery = bind(this._onCallbackQuery, this);
      this._onMessage = bind(this._onMessage, this);
      this._onChosenInlineResult = bind(this._onChosenInlineResult, this);
      this._onInlineQuery = bind(this._onInlineQuery, this);
      var ref;
      this.config = _.extend({}, this.defaultConfig, config);
      this.key = this.config.key;
      this.id = Number((ref = this.key.match(/^\d+/)) != null ? ref[0] : void 0);
      this.commands = [];
      this.sessionManager = this.config.sessionManager(this);
      this.rateLimiter = utils.rateLimiter(this.config.rps);
      this._initApi();
    }


    /*
    Returns middlewares for handling.
    @param {String} commandName the command name
    @param {Object} [params] params
    @option params {Boolean} [includeBot] include bot middleware layer
    @return {Array} middlewares
     */

    Bot.prototype.getCommandsChain = function(commandName, params) {
      var commands;
      if (params == null) {
        params = {};
      }
      if (!commandName) {
        if (params.includeBot) {
          return [this];
        } else {
          return [];
        }
      }
      if (_.isString(commandName)) {
        commandName = commandName.toLowerCase();
      }
      commands = this.commands.slice().reverse().filter(function(command) {
        return command.name === commandName || _.isRegExp(command.name) && command.name.test(commandName);
      }).sort(function(arg, arg1) {
        var name1, name2, ref, res, val1, val2;
        name1 = arg.name;
        name2 = arg1.name;
        ref = [name1, name2].map(function(c) {
          if (_.isRegExp(c)) {
            return 0;
          } else if (c !== commandName) {
            return -1;
          } else {
            return 1;
          }
        }), val1 = ref[0], val2 = ref[1];
        if (val1 < 0 && val2 < 0) {
          return name2.length - name1.length;
        } else {
          return res = val2 - val1;
        }
      });
      if (params.includeBot) {
        commands.push(this);
      }
      return commands;
    };


    /*
    Return middlewares object.
    @param {Array} commands chain array
    @return {Object} middlewares object grouped by stages
     */

    Bot.prototype.getMiddlewaresChains = function(commandsChain) {
      var commands, middlewares;
      commands = commandsChain.concat([this]);
      middlewares = {};
      constants.STAGES.forEach(function(stage) {
        return commands.forEach(function(command) {
          var _commandMiddlewares, name3;
          middlewares[name3 = stage.name] || (middlewares[name3] = []);
          _commandMiddlewares = command.getMiddlewares(stage.name);
          if (stage.invert) {
            return middlewares[stage.name] = _commandMiddlewares.concat(middlewares[stage.name]);
          } else {
            return middlewares[stage.name] = middlewares[stage.name].concat(_commandMiddlewares);
          }
        });
      });
      return middlewares;
    };


    /*
    Return default command.
    @return {Command}
     */

    Bot.prototype.getDefaultCommand = function() {
      return _.find(this.commands, {
        isDefault: true
      });
    };


    /*
    Register new command.
    @param {String|RegExp} name command name
    @param {Object} [options] options command options
    @option options {Boolean} [isDefault] is command default or not
    @option options {Boolean} [compliantKeyboard] handle answers not from keyboard
    @return {Command}
     */

    Bot.prototype.command = function(name, options) {
      var command;
      if (options == null) {
        options = {};
      }
      command = new Command(name, _.extend({}, {
        bot: this
      }, options));
      this.commands.push(command);
      return command;
    };


    /*
    Inline query handler
    @param {Function} handler this function should return promise. first argument is {Context} ctx
     */

    Bot.prototype.inlineQuery = function(handler) {
      return this._inlineQueryHandler = handler;
    };


    /*
    Inline query handler
    @param {Function} handler this function should return promise. first argument is {Context} ctx
     */

    Bot.prototype.chosenInlineResult = function(handler) {
      return this._choseInlineResultHandler = handler;
    };


    /*
    @param {Object} session session object
    @return {Promise} return context
     */

    Bot.prototype.contextFromSession = function(session, prepareContext, params) {
      var handler;
      handler = new CommandHandler(_.extend({
        bot: this,
        session: session,
        isSynthetic: true
      }, params));
      if (prepareContext) {
        prepareContext(handler.context);
      }
      return promise.resolve(handler.handle()).then(function() {
        return handler.context;
      });
    };


    /*
    Invoke callback in context.
    @param {String} chatId
    @param {Funcion} handler
    @return {Promise}
     */

    Bot.prototype.withContext = function(chatId, prepareContext, handler) {
      if (!handler) {
        handler = prepareContext;
        prepareContext = null;
      }
      return this.sessionManager.get(chatId).then((function(_this) {
        return function(session) {
          return _this.contextFromSession(session, prepareContext).then(function(context) {
            return co(handler(context));
          }).then(function() {
            return _this.sessionManager.save(chatId, session);
          });
        };
      })(this));
    };


    /*
    Same as withContext, but with multiple ids.
    @param {Array<String>} chatIds
    @param {Function} handler
     */

    Bot.prototype.withContexts = function(chatIds, handler) {
      return this.sessionManager.getMultiple(chatIds).map((function(_this) {
        return function(session) {
          return _this.contextFromSession(session).then(function(context) {
            return co(handler(context));
          }).then(function() {
            return _this.sessionManager.save(session.meta.sessionId, session);
          });
        };
      })(this));
    };


    /*
    Same as withContexts, but with all chats.
    @param {Function} handler
     */

    Bot.prototype.withAllContexts = function(handler) {
      return this.sessionManager.getAll().map((function(_this) {
        return function(session) {
          return _this.contextFromSession(session).then(function(context) {
            return co(handler(context));
          }).then(function() {
            return _this.sessionManager.save(session.meta.sessionId, session);
          });
        };
      })(this));
    };

    Bot.prototype._onInlineQuery = function(inlineQuery) {
      return this.withContext(inlineQuery.from.id, function(context) {
        return context.setInlineQuery(inlineQuery);
      }, (function(_this) {
        return function(context) {
          return _this._inlineQueryHandler(context);
        };
      })(this));
    };

    Bot.prototype._onChosenInlineResult = function(chosenInlineResult) {
      return this.withContext(chosenInlineResult.from.id, function(context) {
        return context.setChosenInlineResult(chosenInlineResult);
      }, (function(_this) {
        return function(context) {
          return _this._choseInlineResultHandler(context);
        };
      })(this));
    };

    Bot.prototype._onMessage = function(message) {
      var sessionId;
      sessionId = this._provideSessionId(message);
      if (message.date * 1e3 + 60e3 * 5 > Date.now()) {
        return this.sessionManager.get(sessionId).then((function(_this) {
          return function(session) {
            var handler;
            if (_.isEmpty(session)) {
              session = {
                meta: {
                  chat: {
                    id: sessionId
                  }
                }
              };
            }
            handler = new CommandHandler({
              message: message,
              session: session,
              bot: _this
            });
            return promise.resolve(handler.handle()).then(function() {
              return _this.sessionManager.save(sessionId, handler.session);
            });
          };
        })(this));
      } else {
        return console.error('Bad time: ' + JSON.stringify(message));
      }
    };

    Bot.prototype._onCallbackQuery = function(callbackQuery) {
      var message, sessionId;
      message = callbackQuery.message;
      sessionId = message && this._provideSessionId(message) || callbackQuery.from.id;
      return this.sessionManager.get(sessionId).then((function(_this) {
        return function(session) {
          var handler;
          handler = new CommandHandler({
            callbackQuery: callbackQuery,
            session: session,
            bot: _this
          });
          return promise.resolve(handler.handle()).then(function() {
            return _this.sessionManager.save(sessionId, handler.session);
          });
        };
      })(this));
    };

    Bot.prototype._initApi = function() {
      var options;
      options = {};
      if (this.config.webHook) {
        options.webHook = this.config.webHook;
        if (this.config.secure === false) {
          delete options.webHook.key;
        }
      } else {
        options.polling = this.config.polling;
      }
      this.api = new Api(this.key, options);
      this.api.on('message', this._onMessage);
      this.api.on('inline_query', this._onInlineQuery);
      this.api.on('chosen_inline_result', this._onChosenInlineResult);
      this.api.on('callback_query', this._onCallbackQuery);
      if (this.config.webHook) {
        return this._setWebhook();
      } else if (this.config.polling) {
        return this._unsetWebhook();
      }
    };

    Bot.prototype._unsetWebhook = function() {
      return this.api.setWebHook('');
    };

    Bot.prototype._setWebhook = function() {
      return this.api.setWebHook(this.config.webHook.url, this.config.webHook.cert)["finally"](function(res) {
        return console.log('webhook res:', res);
      });
    };

    Bot.prototype._provideSessionId = function(message) {
      return message.chat.id;
    };

    return Bot;

  })();

  _.extend(Bot.prototype, mixins);

  module.exports = function(config) {
    return new Bot(config);
  };

  module.exports.middlewares = require('./middlewares');

  module.exports.sessionManager = sessionManager;

}).call(this);
