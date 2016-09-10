(function() {
  var Promise, co;

  Promise = require('bluebird');

  co = require('co');


  /*
   * limit messages to 10
  promiseRateLimit(30) ->
    ctx.sendMessage('Hello')
   */

  exports.rateLimiter = function(rps) {
    var counter, execNext, fifo, interval, limiter;
    if (rps == null) {
      rps = 30;
    }
    fifo = [];
    counter = 0;
    interval = setInterval(function() {
      counter = 0;
      return execNext();
    }, 1000);
    execNext = function() {
      var handler, ref, reject, resolve;
      if (fifo.length && counter < rps) {
        ref = fifo.pop(), resolve = ref.resolve, reject = ref.reject, handler = ref.handler;
        co(handler()).then(resolve, reject).then(execNext, execNext);
        counter++;
        return execNext();
      }
    };
    limiter = function(handler) {
      var promise;
      promise = new Promise(function(resolve, reject) {
        return fifo.unshift({
          handler: handler,
          resolve: resolve,
          reject: reject
        });
      });
      execNext();
      return promise;
    };
    limiter.destroy = function() {
      var i, len, reject;
      for (i = 0, len = fifo.length; i < len; i++) {
        reject = fifo[i].reject;
        reject(new Error('Destroy in rateLimiter'));
      }
      return clearInterval(interval);
    };
    return limiter;
  };

}).call(this);
