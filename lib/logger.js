'use strict';

var async = require('async');
var _ = require('lodash');
var util = require('util');
var winston = require('winston');
var config = require('./config');

const formatRegExp = /%[sdj%]/g;

module.exports = Logger;

function Logger(options) {
  winston.Logger.call(this, options);
}

util.inherits(Logger, winston.Logger);

Logger.prototype.cli = function (host, options) {
  this.setLevels(config.cli.levels);
  config.addColors(config.cli.colors);

  if (this.transports.console) {
    this.transports.console.colorize = this.transports.console.colorize || true;
    this.transports.console.timestamp = this.transports.console.timestamp || false;
    _.defaults(this.transports.console, options || {});
  }

  return this;
};


//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
Logger.prototype.log = function (level) {
  var args = Array.prototype.slice.call(arguments, 1),
    self = this,
    transports;

  while (args[args.length - 1] === null) {
    args.pop();
  }

  //
  // Determining what is `meta` and what are arguments for string interpolation
  // turns out to be VERY tricky. e.g. in the cases like this:
  //
  //    logger.info('No interpolation symbols', 'ok', 'why', { meta: 'is-this' });
  //
  var callback = typeof args[args.length - 1] === 'function'
    ? args.pop()
    : null;

  //
  // Handle errors appropriately.
  //
  function onError(err) {
    if (callback) {
      callback(err);
    }
    else if (self.emitErrs) {
      self.emit('error', err);
    }
  }

  if (this._names.length === 0) {
    return onError(new Error('Cannot log with no transports.'));
  }
  else if (typeof self.levels[level] === 'undefined') {
    return onError(new Error('Unknown log level: ' + level));
  }

  //
  // If there are no transports that match the level
  // then be eager and return. This could potentially be calculated
  // during `setLevels` for more performance gains.
  //
  var targets = this._names.filter(function (name) {
    var transport = self.transports[name];
    return (transport.level && self.levels[transport.level] >= self.levels[level])
      || (!transport.level && self.levels[self.level] >= self.levels[level]);
  });

  if (!targets.length) {
    if (callback) {
      callback();
    }
    return;
  }

  //
  // Determining what is `meta` and what are arguments for string interpolation
  // turns out to be VERY tricky. e.g. in the cases like this:
  //
  //    logger.info('No interpolation symbols', 'ok', 'why', { meta: 'is-this' });
  //
  var metaType = Object.prototype.toString.call(args[args.length - 1]),
    fmtMatch = args[0] && args[0].match && args[0].match(formatRegExp),
    isFormat = fmtMatch && fmtMatch.length,
    validMeta = !isFormat
      ? metaType === '[object Object]' || metaType === '[object Error]' || metaType === '[object Array]'
      : metaType === '[object Object]',
    meta = validMeta ? args.pop() : {};


  // Updated by taoyuan for split `id` from args
  var id = '';
  if (args.length > 1 && !isFormat) {
    id = args.shift();
  }

  var msg = util.format.apply(null, args);

  //
  // Respond to the callback.
  //
  function finish(err) {
    if (callback) {
      if (err) return callback(err);
      callback(null, level, msg, meta);
    }

    callback = null;
    if (!err) {
      self.emit('logged', level, msg, meta);
    }
  }

  // If we should pad for levels, do so
  if (this.padLevels) {
    msg = new Array(this.levelLength - level.length + 1).join(' ') + msg;
  }

  this.rewriters.forEach(function (rewriter) {
    if (rewriter.length > 4) {
      meta = rewriter(level, id, msg, meta, self);
    } else {
      meta = rewriter(level, msg, meta, self);
    }
  });

  this.filters.forEach(function (filter) {
    var filtered;
    if (filter.length > 4) {
      filtered = filter(level, msg, meta, self);
    } else {
      filtered = filter(level, msg, meta, self);
    }
    if (typeof filtered === 'string')
      msg = filtered;
    else {
      msg = filtered.msg;
      meta = filtered.meta;
    }
  });

  //
  // For consideration of terminal 'color" programs like colors.js,
  // which can add ANSI escape color codes to strings, we destyle the
  // ANSI color escape codes when `this.stripColors` is set.
  //
  // see: http://en.wikipedia.org/wiki/ANSI_escape_code
  //
  if (this.stripColors) {
    var code = /\u001b\[(\d+(;\d+)*)?m/g;
    msg = ('' + msg).replace(code, '');
  }

  // Updated by taoyuan for support `id`
  //
  // Log for each transport and emit 'logging' event
  //
  function transportLog(name, next) {
    var transport = self.transports[name];
    if (transport.log.length <= 2) {
      transport.log({level: level, id: id, message: msg, meta: meta}, done);
    } else if (transport.log.length > 4) {
      transport.log(level, id, msg, meta, done);
    } else {
      transport.log(level, msg, meta, done);
    }

    function done(err) {
      if (err) {
        err.transport = transport;
        finish(err);
        return next();
      }

      self.emit('logging', transport, level, msg, meta);
      next();
    }
  }

  async.forEach(targets, transportLog, finish);
  return this;
};
