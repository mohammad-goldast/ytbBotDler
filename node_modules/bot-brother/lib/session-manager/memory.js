(function() {
  var create, fs, mkdirp, path, promise;

  promise = require('bluebird');

  fs = promise.promisifyAll(require('fs'));

  create = require('./index').create;

  path = require('path');

  mkdirp = require('mkdirp');

  module.exports = function(config) {
    if (config == null) {
      config = {};
    }
    return function(bot) {
      var dir, fileName, parseSession;
      dir = config.dir ? path.resolve(process.cwd(), config.dir) : path.resolve(__dirname, '../../__storage');
      mkdirp.sync(dir);
      parseSession = function(session) {
        return session && JSON.parse(session);
      };
      fileName = function(id) {
        return path.join(dir, bot.id + "." + id + ".json");
      };
      return create({
        save: function(id, session) {
          return fs.writeFileAsync(fileName(id), JSON.stringify(session));
        },
        get: function(id) {
          return fs.statAsync(fileName(id)).then(function(exists) {
            if (exists) {
              return fs.readFileAsync(fileName(id)).then(parseSession);
            } else {
              return null;
            }
          })["catch"](function() {
            return null;
          });
        },
        getMultiple: function(ids) {
          return promise.resolve(ids).map((function(_this) {
            return function(id) {
              return _this.get(id);
            };
          })(this));
        },
        getAll: function() {}
      });
    };
  };

}).call(this);
