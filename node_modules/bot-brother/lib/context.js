(function() {
  var Context, HTTP_RETRIES, RESTRICTED_PROPS, RETRIABLE_ERRORS, _, co, emoji, mixins, prepareText,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice;

  _ = require('lodash');

  emoji = require('node-emoji');

  mixins = require('./mixins');

  co = require('co');

  prepareText = function(text) {
    return emoji.emojify(text);
  };

  RETRIABLE_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN'];

  RESTRICTED_PROPS = ['isRedirected', 'isSynthetic', 'message', 'session', 'bot', 'command', 'isEnded', 'meta', 'type', 'args', 'callbackData', 'inlineQuery', 'chosenInlineResult'];

  HTTP_RETRIES = 20;


  /*
  Context of the bot command
  
  @property {Bot} bot
  @property {Object} session
  @property {Message} message telegram message
  @property {Boolean} isRedirected
  @property {Boolean} isSynthetic this context created with .withContext handler
  @property {Boolean} isEnded this command is ended
  @property {Object} data template data
  @property {Object} meta meta information
  @property {Object} command object tha represent current command. Has follow fields: name, args, type. Where type is 'answer' or 'invoke'
   */

  Context = (function() {
    function Context(handler) {
      this._handler = handler;
      this.bot = this._handler.bot;
      this.type = this._handler.type;
      this.session = this._handler.session.data;
      this.message = this._handler.message;
      this.callbackData = this._handler.callbackData;
      this.callbackQuery = this._handler.callbackQuery;
      this.isRedirected = this._handler.isRedirected;
      this.isSynthetic = this._handler.isSynthetic;
      this.meta = this._handler.session.meta;
      this.command = {
        name: this._handler.name,
        args: this._handler.args,
        type: this._handler.type,
        callbackData: this._handler.callbackData
      };
      this.args = this._handler.args;
      this._api = this._handler.bot.api;
      this._user = this._handler.session.meta.user;
      this._temp = {};
      this.data = {};
    }

    Context.prototype.setInlineQuery = function(inlineQuery) {
      this.inlineQuery = inlineQuery;
    };

    Context.prototype.setChosenInlineResult = function(chosenInlineResult) {
      this.chosenInlineResult = chosenInlineResult;
    };


    /*
    Initialize
     */

    Context.prototype.init = function() {
      var ref;
      this.command = {
        name: this._handler.name,
        args: this._handler.args,
        type: this._handler.type
      };
      this.args = this._handler.args;
      return this.answer = (ref = this._handler.answer) != null ? ref.value : void 0;
    };


    /*
    Hide keyboard
     */

    Context.prototype.hideKeyboard = function() {
      return this.useKeyboard(null);
    };


    /*
    Use previous state keyboard
    @return {Context} this
     */

    Context.prototype.usePrevKeyboard = function() {
      this._temp.usePrevKeyboard = true;
      return this;
    };


    /*
    Use named keyboard
    @return {Context} this
     */

    Context.prototype.useKeyboard = function(name) {
      this._temp.keyboardName = name;
      return this;
    };


    /*
    Use this method to get a list of profile pictures for a user.
    Returns a [UserProfilePhotos](https://core.telegram.org/bots/api#userprofilephotos) object.
    @param  {Number} [offset=0] Sequential number of the first photo to be returned. By default, offset is 0.
    @param  {Number} [limit=1] Limits the number of photos to be retrieved. Values between 1—100 are accepted. Defaults to 1.
    @return {Promise}
    @see https://core.telegram.org/bots/api#getuserprofilephotos
     */

    Context.prototype.getUserProfilePhotos = function(offset, limit) {
      if (offset == null) {
        offset = 0;
      }
      if (limit == null) {
        limit = 1;
      }
      return this.bot.api.getUserProfilePhotos(this._user.id, offset, limit);
    };


    /*
    Render text
    @param {String} key text or key from localization dictionary
    @param {Object} options
     */

    Context.prototype.render = function(key, data, options) {
      return this._handler.renderText(key, _.extend({}, this.data, data), options);
    };


    /*
    Send message
    @param {String} text text or key from localization dictionary
    @param {Object} params additional telegram params
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendmessage
     */

    Context.prototype.sendMessage = function(text, params) {
      if (params == null) {
        params = {};
      }
      if (params.render !== false) {
        text = this.render(text);
      }
      return this._executeApiAction('sendMessage', this.meta.chat.id, prepareText(text), this._prepareParams(params));
    };


    /*
    Same as sendMessage
     */

    Context.prototype.sendText = function(key, params) {
      return this.sendMessage(key, params);
    };


    /*
    Send photo
    @param {String|stream.Stream} photo A file path or a Stream. Can also be a 'file_id' previously uploaded
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendphoto
     */

    Context.prototype.sendPhoto = function(photo, params) {
      if (params == null) {
        params = {};
      }
      if (params.caption) {
        if (params.render !== false) {
          params.caption = this.render(params.caption);
        }
        params.caption = prepareText(params.caption);
      }
      return this._executeApiAction('sendPhoto', this.meta.chat.id, photo, this._prepareParams(params));
    };


    /*
    Forward message
    @param  {Number|String} fromChatId Unique identifier for the chat where the
    original message was sent
    @param  {Number|String} messageId  Unique message identifier
    @return {Promise}
     */

    Context.prototype.forwardMessage = function(fromChatId, messageId) {
      return this._executeApiAction('forwardMessage', this.meta.chat.id, fromChatId, messageId);
    };


    /*
    Send audio
    @param  {String|stream.Stream} audio A file path or a Stream. Can also be a `file_id` previously uploaded.
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendaudio
     */

    Context.prototype.sendAudio = function(audio, params) {
      return this._executeApiAction('sendAudio', this.meta.chat.id, audio, this._prepareParams(params));
    };


    /*
    Send Document
    @param  {String|stream.Stream} doc A file path or a Stream. Can also be a `file_id` previously uploaded.
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendDocument
     */

    Context.prototype.sendDocument = function(doc, params) {
      return this._executeApiAction('sendDocument', this.meta.chat.id, doc, this._prepareParams(params));
    };


    /*
    Send .webp stickers.
    @param  {String|stream.Stream} sticker A file path or a Stream. Can also be a `file_id` previously uploaded.
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendsticker
     */

    Context.prototype.sendSticker = function(sticker, params) {
      return this._executeApiAction('sendSticker', this.meta.chat.id, sticker, this._prepareParams(params));
    };


    /*
    Send video files, Telegram clients support mp4 videos (other formats may be sent with `sendDocument`)
    @param  {String|stream.Stream} video A file path or a Stream. Can also be a `file_id` previously uploaded.
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendvideo
     */

    Context.prototype.sendVideo = function(video, params) {
      return this._executeApiAction('sendVideo', this.meta.chat.id, video, this._prepareParams(params));
    };


    /*
    Send chat action.
    `typing` for text messages,
    `upload_photo` for photos, `record_video` or `upload_video` for videos,
    `record_audio` or `upload_audio` for audio files, `upload_document` for general files,
    `find_location` for location data.
    @param  {Number|String} chatId  Unique identifier for the message recipient
    @param  {String} action Type of action to broadcast.
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendchataction
     */

    Context.prototype.sendChatAction = function(action) {
      return this._executeApiAction('chatAction', this.meta.chat.id, action);
    };


    /*
    Send location.
    Use this method to send point on the map.
    @param  {Float} latitude Latitude of location
    @param  {Float} longitude Longitude of location
    @param  {Object} [params] Additional Telegram query options
    @return {Promise}
    @see https://core.telegram.org/bots/api#sendlocation
     */

    Context.prototype.sendLocation = function(latitude, longitude, params) {
      return this._executeApiAction('sendLocation', this.meta.chat.id, latitude, longitude, this._prepareParams(params));
    };

    Context.prototype.updateCaption = function(text, params) {
      var _params;
      if (params == null) {
        params = {};
      }
      if (params.render !== false) {
        text = this.render(text);
      }
      _params = {
        reply_markup: this._provideKeyboardMarkup({
          inline: true
        })
      };
      if (this.callbackQuery.inline_message_id) {
        _params.inline_message_id = this.callbackQuery.inline_message_id;
      } else {
        _.extend(_params, {
          chat_id: this.meta.chat.id,
          message_id: this.callbackQuery.message.message_id
        });
      }
      return this._executeApiAction('editMessageCaption', prepareText(text), _.extend(_params, params));
    };

    Context.prototype.updateText = function(text, params) {
      var _params;
      if (params == null) {
        params = {};
      }
      if (params.render !== false) {
        text = this.render(text);
      }
      _params = {
        reply_markup: this._provideKeyboardMarkup({
          inline: true
        })
      };
      if (this.callbackQuery.inline_message_id) {
        _params.inline_message_id = this.callbackQuery.inline_message_id;
      } else {
        _.extend(_params, {
          chat_id: this.meta.chat.id,
          message_id: this.callbackQuery.message.message_id
        });
      }
      return this._executeApiAction('editMessageText', prepareText(text), _.extend(_params, params));
    };

    Context.prototype.updateKeyboard = function(params) {
      var _params;
      if (params == null) {
        params = {};
      }
      _params = {};
      if (this.callbackQuery.inline_message_id) {
        _params.inline_message_id = this.callbackQuery.inline_message_id;
      } else {
        _.extend(_params, {
          chat_id: this.meta.chat.id,
          message_id: this.callbackQuery.message.message_id
        });
      }
      return this._executeApiAction('editMessageReplyMarkup', this._provideKeyboardMarkup({
        inline: true
      }), _.extend(_params, params));
    };

    Context.prototype.answerInlineQuery = function(results, params) {
      results.forEach((function(_this) {
        return function(result) {
          if (result.keyboard) {
            result.reply_markup = {
              inline_keyboard: _this._renderKeyboard({
                inline: true,
                keyboard: result.keyboard
              })
            };
            return delete result.keyboard;
          }
        };
      })(this));
      return this._executeApiAction('answerInlineQuery', this.inlineQuery.id, results, params);
    };


    /*
    Set locale for context
    @param {String} locale Locale
     */

    Context.prototype.setLocale = function(locale) {
      return this._handler.setLocale(locale);
    };


    /*
    Get current context locale
    @return {String}
     */

    Context.prototype.getLocale = function() {
      return this._handler.getLocale();
    };


    /*
    Go to certain command
    
    @param {String} name command name
    @param {Object} params params
    @option params {Array<String>} [args] Arguments for command
    @option params {Boolean} [noChangeHistory=false] No change chain history
    @option params {String} [stage='invoke'] 'invoke'|'answer'|'callback'
    @return {Promise}
     */

    Context.prototype.go = function(name, params) {
      this.end();
      return this._handler.go(name, params);
    };


    /*
    Same as @go, but stage is 'callback'
     */

    Context.prototype.goCallback = function(name, params) {
      return this.go(name, _.extend(params, {
        stage: 'callback'
      }));
    };


    /*
    Go to parent command.
    @return {Promise}
     */

    Context.prototype.goParent = function() {
      return this.go(this._handler.name.split('_').slice(0, -1).join('_') || this._handler.name);
    };


    /*
    Go to previous command.
    @return {Promise}
     */

    Context.prototype.goBack = function() {
      var prevCommandName;
      prevCommandName = this._handler.getPrevStateName();
      return this.go(prevCommandName, {
        noChangeHistory: true,
        args: this._handler.getPrevStateArgs()
      });
    };


    /*
    Repeat current command
    @return {Promise}
     */

    Context.prototype.repeat = function() {
      return this.go(this._handler.name, {
        noChangeHistory: true,
        args: this.command.args
      });
    };


    /*
    Break middlewares chain
     */

    Context.prototype.end = function() {
      return this.isEnded = true;
    };


    /*
    Clone context
    @param {CommandHandler} handler Command handler for new context
    @return {Context}
     */

    Context.prototype.clone = function(handler) {
      var res, setProps;
      res = new Context(handler);
      setProps = Object.getOwnPropertyNames(this).filter(function(prop) {
        return !(indexOf.call(RESTRICTED_PROPS, prop) >= 0 || prop.indexOf('_') === 0);
      });
      return _.extend(res, _.pick(this, setProps));
    };

    Context.prototype._executeApiAction = function() {
      var args, method;
      method = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      return this._handler.executeStage('beforeSend').then((function(_this) {
        return function() {
          var execAction, retries;
          retries = HTTP_RETRIES;
          execAction = function() {
            return _this.bot.rateLimiter(function() {
              var ref;
              return (ref = _this._api)[method].apply(ref, args);
            })["catch"](function(e) {
              var httpCode, ref;
              httpCode = parseInt(e.message);
              if (retries-- > 0 && ((ref = e != null ? e.code : void 0, indexOf.call(RETRIABLE_ERRORS, ref) >= 0) || (500 <= httpCode && httpCode < 600) || httpCode === 420)) {
                return execAction();
              } else {
                throw e;
              }
            });
          };
          return execAction();
        };
      })(this)).then(co.wrap((function(_this) {
        return function*(message) {
          var inlineMarkup;
          if (_this._temp.inlineMarkupSent) {
            _this._handler.resetBackHistory();
          } else {
            inlineMarkup = _this._provideKeyboardMarkup({
              inline: true
            });
            if (inlineMarkup && (method !== 'editMessageReplyMarkup' && method !== 'editMessageText' && method !== 'editMessageCaption') && (message != null ? message.message_id : void 0)) {
              (yield _this._executeApiAction('editMessageReplyMarkup', JSON.stringify(inlineMarkup), {
                chat_id: _this.meta.chat.id,
                message_id: message.message_id
              }));
            }
          }
          return _this._handler.executeStage('afterSend').then(function() {
            return message;
          });
        };
      })(this)));
    };

    Context.prototype._prepareParams = function(params) {
      var _params, markup;
      if (params == null) {
        params = {};
      }
      markup = this._provideKeyboardMarkup();
      if (!markup) {
        markup = this._provideKeyboardMarkup({
          inline: true
        });
        this._temp.inlineMarkupSent = true;
      }
      _params = {};
      if (params.caption) {
        params.caption = prepareText(params.caption);
      }
      if (markup) {
        _params.reply_markup = JSON.stringify(markup);
      }
      return _.extend(_params, params);
    };

    Context.prototype._renderKeyboard = function(params) {
      if (this._temp.keyboardName === null && !params.inline) {
        return null;
      } else {
        return this._handler.renderKeyboard(this._temp.keyboardName, params);
      }
    };

    Context.prototype._provideKeyboardMarkup = function(params) {
      var markup, noPrivate;
      if (params == null) {
        params = {};
      }
      noPrivate = this.meta.chat.type !== 'private';
      if (params.inline) {
        markup = this._renderKeyboard(params);
        if (markup && !_.isEmpty(markup) && markup.some(function(el) {
          return !_.isEmpty(el);
        })) {
          return {
            inline_keyboard: markup
          };
        } else {
          return null;
        }
      } else {
        if (this._temp.usePrevKeyboard || this._usePrevKeyboard) {
          return null;
        } else {
          markup = this._renderKeyboard(params);
          if (markup != null ? markup.prevKeyboard : void 0) {
            return null;
          } else {
            if (markup && !_.isEmpty(markup) && markup.some(function(el) {
              return !_.isEmpty(el);
            })) {
              return {
                keyboard: markup,
                resize_keyboard: true
              };
            } else {
              this._handler.unsetKeyboardMap();
              if (noPrivate) {
                return {
                  force_reply: true
                };
              } else {
                return {
                  hide_keyboard: true
                };
              }
            }
          }
        }
      }
    };

    return Context;

  })();

  _.extend(Context.prototype, mixins);

  module.exports = Context;

}).call(this);
