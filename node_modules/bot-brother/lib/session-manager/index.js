(function() {
  exports.create = function(methods) {
    var get, getAll, getMultiple, save;
    save = methods.save, get = methods.get, getMultiple = methods.getMultiple, getAll = methods.getAll;
    if (!save || !get) {
      throw new Error('You should define "save" and "get" methods');
    }
    return methods;
  };

  exports.redis = require('./redis');

  exports.memory = require('./memory');

}).call(this);
