(function() {
  var KEYS, Keyboard, _, ejs, emoji,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  ejs = require('ejs');

  _ = require('lodash');

  emoji = require('node-emoji');


  /*
  
  Keyboard examples
  
  [
    [
      {'text.key': 10}
      {'text.key1': {value: 10}}
      {'text.key2': {value: 10}}
      {key: 'text.key3', value: 'text.key3'}
      {text: 'Hello <%=user.name%>'} # raw text, which we compile
      {text: 'Hello <%=user.name%>', value: 'hello'} # raw text, which we compile
      'rowTemplate' # embed row
    ], [
      {'text.key': {go: 'state.name'}}
      {'text.key': {go: 'state.name'}}
      {'text.key': {go: 'state.name'}}
      {'text.key': {go: 'state.name'}}
      {'text.key': {go: 'state.name$callback'}}
      {'text.key': {go: '$back', args: [123,123]}}
      {'text.key': {go: '$parent', args: [234, 567]}}
      {'text.key': {go: '$parent', args: [234, 567], isShown: (ctx) -> ctx.data.user.age > 18}}
    ],
    'keyboardTemplate' # embed keyboard
  ]
   */

  KEYS = ['key', 'text', 'value', 'go', 'args', 'isShown', 'url', 'callbackData', 'switchInlineQuery', 'requestContact', 'requestLocation'];

  Keyboard = (function() {
    function Keyboard(keyboard, params, command1) {
      this.command = command1;
      this.type = params.type || 'table';
      this.inline = params.inline;
      this.keyboard = _.cloneDeep(keyboard).map((function(_this) {
        return function(row, i) {
          if (_this.type === 'row' && _.isPlainObject(row)) {
            row = _this.processColumn(row);
          }
          if (_.isArray(row)) {
            row = row.map(function(column) {
              if (_.isPlainObject(column)) {
                column = _this.processColumn(column);
              }
              return column;
            });
          }
          return row;
        };
      })(this));
    }

    Keyboard.prototype.processColumn = function(column) {
      var keys, ref, val;
      keys = Object.keys(column);
      if (ref = keys[0], indexOf.call(KEYS, ref) < 0) {
        val = column[keys[0]];
        if (_.isString(val)) {
          column = {
            key: keys[0],
            value: val
          };
        } else if (_.isFunction(val)) {
          column = {
            key: keys[0],
            handler: val
          };
        } else {
          column = {
            key: keys[0]
          };
          _.extend(column, val);
        }
      }
      if (column.text) {
        column.text = ejs.compile(column.text);
      }
      return column;
    };

    Keyboard.prototype.replaceLayouts = function(chain, locale) {
      var _row, column, i, j, keyboard, l, len, len1, len2, len3, m, n, ref, ref1, row;
      if (this.type === 'table') {
        keyboard = [];
        ref = this.keyboard;
        for (j = 0, len = ref.length; j < len; j++) {
          row = ref[j];
          if (_.isString(row)) {
            keyboard = keyboard.concat(this.embedLayout(row, chain, locale, 'table'));
          } else {
            keyboard.push(row);
          }
        }
        for (i = l = 0, len1 = keyboard.length; l < len1; i = ++l) {
          row = keyboard[i];
          _row = [];
          for (m = 0, len2 = row.length; m < len2; m++) {
            column = row[m];
            if (_.isString(column)) {
              _row = _row.concat(this.embedLayout(column, chain, locale, 'row'));
            } else {
              _row.push(column);
            }
          }
          keyboard[i] = _row;
        }
      } else {
        keyboard = [];
        ref1 = this.keyboard;
        for (n = 0, len3 = ref1.length; n < len3; n++) {
          column = ref1[n];
          if (_.isString(column)) {
            keyboard = keyboard.concat(this.embedLayout(column, chain, locale, 'row'));
          } else {
            keyboard.push(column);
          }
        }
      }
      return keyboard;
    };

    Keyboard.prototype.embedLayout = function(name, chain, locale, type) {
      var command, j, keyboard, len;
      for (j = 0, len = chain.length; j < len; j++) {
        command = chain[j];
        keyboard = command.getKeyboard(name, locale, {
          type: type
        }) || command.getKeyboard(name, null, {
          type: type
        });
        if (keyboard) {
          break;
        }
      }
      if (!keyboard) {
        throw new Error("Can not find keyboard: " + name);
      }
      return keyboard.replaceLayouts(chain, locale);
    };

    Keyboard.prototype.render = function(locale, chain, data, handler) {
      var button, column, i, j, k, keyboard, l, len, len1, len2, m, map, markup, markupRow, ref, ref1, row, text;
      keyboard = this.replaceLayouts(chain, locale);
      map = {};
      markup = [];
      for (j = 0, len = keyboard.length; j < len; j++) {
        row = keyboard[j];
        markupRow = [];
        for (i = l = 0, len1 = row.length; l < len1; i = ++l) {
          column = row[i];
          text = column.text ? column.text(data) : handler.renderText(column.key, data);
          ref = ['args', 'callbackData', 'value'];
          for (m = 0, len2 = ref.length; m < len2; m++) {
            k = ref[m];
            if (_.isFunction(column[k])) {
              column[k] = column[k](handler.context);
            }
          }
          text = emoji.emojify(text);
          if ((column.isShown == null) || _.isFunction(column.isShown) && column.isShown(handler.context) || _.isBoolean(column.isShown) && column.isShown) {
            button = {
              text: text
            };
            if (this.inline) {
              if (column.url) {
                button.url = column.url;
              }
              if (column.switchInlineQuery != null) {
                button.switch_inline_query = column.switchInlineQuery;
              }
              button.callback_data = [column.go || handler.name + '$cb', ((ref1 = column.args) != null ? ref1.join(',') : void 0) || '', column.value || '', JSON.stringify(column.callbackData || {})].join('|');
            } else {
              if (column.requestContact) {
                button.request_contact = true;
              }
              if (column.requestLocation) {
                button.request_location = true;
              }
            }
            markupRow.push(button);
            map[text] = _.pick(column, 'value', 'go', 'args', 'requestContact', 'requestLocation');
          }
        }
        if (markupRow.length) {
          markup.push(markupRow);
        }
      }
      return {
        markup: markup,
        map: map
      };
    };

    return Keyboard;

  })();

  module.exports = Keyboard;

}).call(this);
