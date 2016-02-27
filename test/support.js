'use strict';

var _ = require('lodash');
var assert = require('chai').assert,
  fs = require('fs'),
  path = require('path'),
  spawn = require('child_process').spawn,
  util = require('util'),
  stripAnsi = require('strip-ansi'),
  logu = require('..');

var support = exports;

support.stripColors = function (s) {
  return stripAnsi(s);
};

support.levelPad = function (size) {
  size = size || 6;
  return function (level) {
    size = Math.max(level.length, size);
    return _.padEnd(level, size);
  }
};

support.padLevel = function (level) {
  return support.levelPad()(level);
};

support.size = function (obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }

  return size;
};

support.tryUnlink = function (file) {
  try {
    fs.unlinkSync(file)
  }
  catch (ex) {
  }
};

support.assertDateInfo = function (info) {
  assert.isNumber(Date.parse(info));
};

support.assertProcessInfo = function (info) {
  assert.isNumber(info.pid);
  assert.isNumber(info.uid);
  assert.isNumber(info.gid);
  assert.isString(info.cwd);
  assert.isString(info.execPath);
  assert.isString(info.version);
  assert.isArray(info.argv);
  assert.isObject(info.memoryUsage);
};

support.assertOsInfo = function (info) {
  assert.isArray(info.loadavg);
  assert.isNumber(info.uptime);
};

support.assertTrace = function (trace) {
  trace.forEach(function (site) {
    assert.isTrue(!site.column || typeof site.column === 'number');
    assert.isTrue(!site.line || typeof site.line === 'number');
    assert.isTrue(!site.file || typeof site.file === 'string');
    assert.isTrue(!site.method || typeof site.method === 'string');
    assert.isTrue(!site.function || typeof site.function === 'string');
    assert.isTrue(typeof site.native === 'boolean');
  });
};

support.assertLogger = function (logger, level) {
  assert.instanceOf(logger, logu.Logger);
  assert.isFunction(logger.log);
  assert.isFunction(logger.add);
  assert.isFunction(logger.remove);
  assert.equal(logger.level, level || "info");
  Object.keys(logger.levels).forEach(function (method) {
    assert.isFunction(logger[method]);
  });
};

support.assertConsole = function (transport) {
  assert.instanceOf(transport, logu.transports.Console);
  assert.isFunction(transport.log);
};

support.assertMemory = function (transport) {
  assert.instanceOf(transport, logu.transports.Memory);
  assert.isFunction(transport.log);
};

support.assertFile = function (transport) {
  assert.instanceOf(transport, logu.transports.File);
  assert.isFunction(transport.log);
};

support.assertCouchdb = function (transport) {
  assert.instanceOf(transport, logu.transports.Couchdb);
  assert.isFunction(transport.log);
};

support.assertHandleExceptions = function (options) {
  return {
    topic: function () {
      var that = this,
        child = spawn('node', [options.script]);

      support.tryUnlink(options.logfile);
      child.on('exit', function () {
        fs.readFile(options.logfile, that.callback);
      });
    },
    "should save the error information to the specified file": function (err, data) {
      assert.isTrue(!err);
      data = JSON.parse(data);

      assert.isObject(data);
      support.assertProcessInfo(data.process);
      support.assertOsInfo(data.os);
      support.assertTrace(data.trace);
      if (options.message) {
        assert.equal('uncaughtException: ' + options.message, data.message);
      }
    }
  };
};

support.assertFailedTransport = function (transport) {
  return {
    topic: function () {
      var self = this;
      transport.on('error', function (emitErr) {
        transport.log('error', 'test message 2', {}, function (logErr, logged) {
          self.callback(emitErr, logErr);
        });
      });
      transport.log('error', 'test message');
    },
    "should emit an error": function (emitErr, logErr) {
      assert.instanceOf(emitErr, Error);
      assert.equal(emitErr.code, 'ENOENT');
    },
    "should enter noop failed state": function (emitErr, logErr) {
      assert.instanceOf(logErr, Error);
      assert.equal(transport._failures, transport.maxRetries);
    }
  };
};

support.testNpmLevels = function (transport, assertMsg, assertFn) {
  return support.testLevels(logu.config.npm.levels, transport, assertMsg, assertFn);
};

support.testSyslogLevels = function (transport, assertMsg, assertFn) {
  return support.testLevels(logu.config.syslog.levels, transport, assertMsg, assertFn);
};

support.testLevels = function (levels, transport, assertMsg, assertFn) {
  Object.keys(levels).forEach(function (level) {
    it(assertMsg + ' in [' + level + ']', function () {
      transport.log(level, 'test message', {}, assertFn);
    })
  });

  it(assertMsg + ' when passed metadata', function () {
    transport.log('info', 'test message', {metadata: true}, assertFn);
  });

  it(assertMsg + ' when passed primitive metadata', function () {
    transport.log('info', 'test message', 'metadata', assertFn);
  });

  var circmetadata = {};
  circmetadata['metadata'] = circmetadata;

  it(assertMsg + ' when passed circular metadata', function () {
    transport.log('info', 'test message', circmetadata, assertFn);
  });
};

support.assertOptionsThrow = function (options, errMsg) {
  return function () {
    assert.throws(
      function () {
        try {
          new (logu.transports.Console)(options);
        } catch (err) {
          throw(err);
        }
      },
      new RegExp('^' + errMsg.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$')
    );
  }
};

support.assertStderrLevels = function (transport, stderrLevels) {
  return function () {
    assert.equal(
      JSON.stringify(Object.keys(transport.stderrLevels).sort()),
      JSON.stringify(stderrLevels.sort())
    );
  }
};

support.testLoggingToStreams = function (levels, transport, stderrLevels, stdMocks) {

  it('output should go to the appropriate streams', function () {
    stdMocks.use();
    transport.showLevel = true;
    Object.keys(levels).forEach(function (level) {
      transport.log(
        level,
        level + ' should go to ' + (stderrLevels.indexOf(level) > -1 ? 'stderr' : 'stdout'),
        {},
        function () {
        }
      );
    });
    var output = stdMocks.flush();
    stdMocks.restore();

    var pad = support.levelPad();
    var outCount = 0, errCount = 0;
    Object.keys(levels).forEach(function (level) {
      var line;
      if (stderrLevels.indexOf(level) > -1) {
        line = output.stderr[errCount++];
        assert.equal(line, pad(level + ':') + ' ' + level + ' should go to stderr\n');
      } else {
        line = output.stdout[outCount++];
        assert.equal(line, pad(level + ':') + ' ' + level + ' should go to stdout\n');
      }
    });
  });
};
