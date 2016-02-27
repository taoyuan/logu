'use strict';

var path = require('path'),
  assert = require('chai').assert,
  logu = require('../..'),
  s = require('../support'),
  stdMocks = require('std-mocks');

var npmTransport = new (logu.transports.Console)(),
  syslogTransport = new (logu.transports.Console)({levels: logu.config.syslog.levels}),
  defaultTransport = new (logu.transports.Console)(),
  rawTransport = new (logu.transports.Console)({level: 'verbose', raw: true}),
  debugStdoutTransport = new (logu.transports.Console)({debugStdout: true}),
  stderrLevelsTransport = new (logu.transports.Console)({stderrLevels: ['info', 'warn']}),
  customLevels = {
    alpha: 0,
    beta: 1,
    gamma: 2,
    delta: 3,
    epsilon: 4
  },
  customLevelsAndStderrTransport = new (logu.transports.Console)({
    levels: customLevels,
    stderrLevels: ['delta', 'epsilon']
  }),
  noStderrTransport = new (logu.transports.Console)({stderrLevels: []});

describe('transports/console', function () {

  describe('An instance of the Console Transport', function () {
    it('should not have level prepended with showLevel off', function (done) {
      npmTransport.showLevel = false;
      stdMocks.use();
      npmTransport.log('info', 'This is a message', {meta: true}, function () {
        stdMocks.restore();
        var output = stdMocks.flush();
        var line = output.stdout[0];

        assert.equal(line, 'This is a message meta=true\n');
        done();
      });
    });

    it('should have level prepended with showLevel on', function () {
      npmTransport.showLevel = true;
      stdMocks.use();
      npmTransport.log('info', '');

      stdMocks.restore();
      var output = stdMocks.flush();
      var line = output.stdout[0];

      assert.equal(line, s.padLevel('info:') + ' \n');
    });

    it('should have timestamp prepended with "short" timestamp', function () {
      npmTransport.timestamp = 'short';
      stdMocks.use();
      npmTransport.log('info', '');

      stdMocks.restore();
      var output = stdMocks.flush();
      var line = s.stripColors(output.stdout[0]);

      assert.isTrue(/^\[[\d:\.]+]/.test(line));
    });

    it('should not have timestamp prepended with timestamp off', function (done) {
      npmTransport.timestamp = false;
      stdMocks.use();
      npmTransport.log('info', 'This is a message', {meta: true}, function () {
        stdMocks.restore();
        var output = stdMocks.flush();
        var line = output.stdout[0];

        assert.equal(line, s.padLevel('info:') + ' This is a message meta=true\n');
        done();
      });
    });

    describe('should have the proper methods defined the log() method with npm levels', function () {
      s.testNpmLevels(npmTransport, "should respond with true", function (err, logged) {
        assert.isNull(err);
        assert.isTrue(logged);
      });
    });

    describe('should have the proper methods defined the log() method with syslog levels', function () {
      s.testNpmLevels(syslogTransport, "should respond with true", function (err, logged) {
        assert.isNull(err);
        assert.isTrue(logged);
      });
    });

    it('should have end-of-line character appended with end-of-line', function () {
      npmTransport.eol = 'X';
      stdMocks.use();
      npmTransport.log('info', 'This is a message', {meta: true}, function () {
        stdMocks.restore();
        var output = stdMocks.flush();
        var line = output.stdout[0];
        console.dir(line);

        assert.equal(line, s.padLevel('info:') + ' This is a message meta=trueX');
      });
    });
  });

  describe('An instance of a raw Console transport', function () {
    it('should output json with message property logging to stdout', function () {
      stdMocks.use();
      rawTransport.log('verbose', 'hello there');
      stdMocks.restore();
      var output = stdMocks.flush();
      assert.ok(output.stdout[0].indexOf('"message":"hello there"') > -1);
    });
  });

  describe('An instance of the Console Transport with no options', function () {
    it('should set stderrLevels to "error" and "debug" by default', s.assertStderrLevels(
      defaultTransport, ['error', 'debug']
    ));

    describe('should log only "error" and "debug" to stderr', function () {
      s.testLoggingToStreams(logu.config.npm.levels, defaultTransport, ['debug', 'error'], stdMocks)
    });
  });

  describe('An instance of the Console Transport with debugStdout set', function () {
    it('should throw an Error if stderrLevels is set', s.assertOptionsThrow(
      { debugStdout: true, stderrLevels: ['debug'] },
      "Cannot set debugStdout and stderrLevels together"
    ));

    it('should set stderrLevels to "error" by default', s.assertStderrLevels(
      debugStdoutTransport,
      ['error']
    ));

    describe('should log only the "error" level to stderr', function () {
      s.testLoggingToStreams(
        logu.config.npm.levels, debugStdoutTransport, ['error'], stdMocks
      )
    });
  });

  describe('An instance of the Console Transport with stderrLevels set', function () {
    it('should throw an Error if stderrLevels is set but not an Array', s.assertOptionsThrow(
      { debugStdout: false, stderrLevels: 'Not an Array'},
      "Cannot set stderrLevels to type other than Array"
    ));

    it('should throw an Error if stderrLevels contains non-string elements', s.assertOptionsThrow(
      { debugStdout: false, stderrLevels: ["good", /^invalid$/, "valid"] },
      "Cannot have non-string elements in stderrLevels Array"
    ));

    it('should correctly set stderrLevels', s.assertStderrLevels(
      stderrLevelsTransport,
      ['info', 'warn']
    ));

    describe('should log only the levels in stderrLevels to stderr', function () {
      s.testLoggingToStreams(
        logu.config.npm.levels, stderrLevelsTransport, ['info', 'warn'], stdMocks
      )
    });
  });

  describe('An instance of the Console Transport with stderrLevels set to an empty array', function () {
    describe('should log only to stdout, and not to stderr', function () {
      s.testLoggingToStreams(
        logu.config.npm.levels, noStderrTransport, [], stdMocks
      )
    });
  });

  describe('An instance of the Console Transport with custom levels and stderrLevels set', function () {
    describe('should log only the levels in stderrLevels to stderr', function () {
      s.testLoggingToStreams(
        customLevels, customLevelsAndStderrTransport, ['delta', 'epsilon'], stdMocks
      )
    });
  });
});
