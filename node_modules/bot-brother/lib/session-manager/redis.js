(function() {
  var DEFAULT_PREFIX, DEFUALT_CONFIG, create, promise, redis;

  promise = require('bluebird');

  redis = require('redis');

  create = require('./index').create;

  DEFAULT_PREFIX = 'BOT_SESSIONS';

  DEFUALT_CONFIG = {
    host: '127.0.0.1',
    port: '6379'
  };

  promise.promisifyAll(redis);

  module.exports = function(config, prefix) {
    if (prefix == null) {
      prefix = DEFAULT_PREFIX;
    }
    return function(bot) {
      var client, parseSession;
      config || (config = DEFUALT_CONFIG);
      client = config.client || redis.createClient(config);
      if (config.db) {
        client.select(config.db);
      }
      parseSession = function(session) {
        return session && JSON.parse(session);
      };
      return create({
        save: function(id, session) {
          return client.hsetAsync(prefix + ":" + bot.id, id, JSON.stringify(session));
        },
        get: function(id) {
          return client.hgetAsync(prefix + ":" + bot.id, id).then(parseSession);
        },
        getMultiple: function(ids) {
          return client.hmgetAsync([prefix + ":" + bot.id].concat(ids)).then(function(sessions) {
            return sessions.filter(Boolean).map(parseSession);
          });
        },
        getAll: function() {
          return client.hvalsAsync(prefix + ":" + bot.id).then(function(sessions) {
            return sessions.filter(Boolean).map(parseSession);
          });
        }
      });
    };
  };

}).call(this);
