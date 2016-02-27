var _ = require('lodash');
var winston = require('winston');

var logu = module.exports = {};

//
// Expose version using `pkginfo`
//
require('pkginfo')(module, 'version');

//
// Include transports defined by default by logu
//
logu.transports = require('./transports');

//
// Expose utility methods
//
var common          = require('winston/lib/winston/common');
logu.hash           = winston.hash;
logu.clone          = winston.clone;
logu.longestElement = winston.longestElement;
logu.exception      = winston.exception;
logu.config         = require('./config');
logu.addColors      = logu.config.addColors;

//
// Expose core Logging-related prototypes.
//
logu.Container      = winston.Container;
logu.Logger         = require('./logger');
logu.Transport      = winston.Transport;

//
// We create and expose a default `Container` to `logu.loggers` so that the
// programmer may manage multiple `logu.Logger` instances without any additional overhead.
//
// ### some-file1.js
//
//     var logger = require('logu').loggers.get('something');
//
// ### some-file2.js
//
//     var logger = require('logu').loggers.get('something');
//
logu.loggers = new logu.Container();

//
// We create and expose a 'defaultLogger' so that the programmer may do the
// following without the need to create an instance of logu.Logger directly:
//
//     var logu = require('logu');
//     logu.log('info', 'some message');
//     logu.error('some error');
//
var defaultLogger = new logu.Logger({
  transports: [new logu.transports.Console()]
});

//
// Pass through the target methods onto `logu.
//
var methods = [
  'log',
  'query',
  'stream',
  'add',
  'remove',
  'clear',
  'profile',
  'startTimer',
  'extend',
  'cli',
  'handleExceptions',
  'unhandleExceptions',
  'addRewriter',
  'addFilter'
];
common.setLevels(logu, null, defaultLogger.levels);
methods.forEach(function (method) {
  logu[method] = function () {
    return defaultLogger[method].apply(defaultLogger, arguments);
  };
});

//
// ### function cli ()
// Configures the default logu logger to have the
// settings for command-line interfaces: no timestamp,
// colors enabled, padded output, and additional levels.
//
logu.cli = function (host, options) {
  if (_.isObjectLike(host)) {
    options = host;
    host = null;
  }
  options = options || {};
  if (host) {
    options.host = host;
  }
  
  common.setLevels(logu, defaultLogger.levels, logu.config.cli.levels);
  defaultLogger.setLevels(logu.config.cli.levels);
  logu.config.addColors(logu.config.cli.colors);

  if (defaultLogger.transports.console) {
    _.assign(defaultLogger.transports.console, {
      colorize: true,
      timestamp: false
    }, options || {});
  }

  return logu;
};

//
// ### function setLevels (target)
// #### @target {Object} Target levels to use
// Sets the `target` levels specified on the default logu logger.
//
logu.setLevels = function (target) {
  common.setLevels(logu, defaultLogger.levels, target);
  defaultLogger.setLevels(target);
};

//
// Define getter / setter for the default logger level
// which need to be exposed by logu.
//
Object.defineProperty(logu, 'level', {
  get: function () {
    return defaultLogger.level;
  },
  set: function (val) {
    defaultLogger.level = val;

    Object.keys(defaultLogger.transports).forEach(function(key) {
      defaultLogger.transports[key].level = val;
    });
  }
});

//
// Define getters / setters for appropriate properties of the
// default logger which need to be exposed by logu.
//
['emitErrs', 'exitOnError', 'padLevels', 'levelLength', 'stripColors'].forEach(function (prop) {
  Object.defineProperty(logu, prop, {
    get: function () {
      return defaultLogger[prop];
    },
    set: function (val) {
      defaultLogger[prop] = val;
    }
  });
});

//
// @default {Object}
// The default transports and exceptionHandlers for
// the default logu logger.
//
Object.defineProperty(logu, 'default', {
  get: function () {
    return {
      transports: defaultLogger.transports,
      exceptionHandlers: defaultLogger.exceptionHandlers
    };
  }
});
