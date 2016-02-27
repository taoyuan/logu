'use strict';

var assert = require('chai').assert,
  path = require('path'),
  util = require('util'),
  stdMocks = require('std-mocks'),
  logu = require('..'),
  s = require('./support');

describe('logu/logger', function () {

  describe("The logu logger", function () {
    var logger;
    before(function () {
      logger = new (logu.Logger)({
        transports: [
          new (logu.transports.Console)()
        ]
      });
    });

    describe("The log() method", function () {

      it("when passed undefined should not throw", function () {
        assert.doesNotThrow(function () {
          logger.log('info', undefined)
        });
      });

      it("when passed an Error object as meta", function (done) {
        logger.once('logging', function (log) {
          assert.instanceOf(log.meta, Error);
          done();
        });
        logger.log('info', 'An error happened: ', new Error('I am something bad'));
      });

      it("when passed a string placeholder", function (done) {
        logger.once('logging', function (log) {
          assert.strictEqual(log.message, 'test message my string');
          done();
        });
        logger.log('info', 'test message %s', 'my string');
      });

    });

    describe("The cli() method", function () {
      it("should log with host", function (done) {
        logger.cli('abc');
        stdMocks.use();
        logger.log('info', 'This is a message', {meta: true}, function () {
          stdMocks.restore();
          var output = stdMocks.flush();
          var line = output.stdout[0];
          assert.isTrue(line.indexOf('abc') >= 0);
          done();
        });
      });
    });

  });


  describe('Building a logger with two file transports', function () {
    var logger;
    before(function () {
      logger = new (logu.Logger)({
        transports: [
          new (logu.transports.File)({
            name: 'filelog-info.log',
            filename: path.join(__dirname, 'fixtures', 'logs', 'filelog-info.log'),
            level: 'info'
          }),
          new (logu.transports.File)({
            name: 'filelog-error.log',
            filename: path.join(__dirname, 'fixtures', 'logs', 'filelog-error.log'),
            level: 'error'
          })
        ]
      });
    });

    it("should respond with a proper logger", function () {
      assert.include(logger._names, 'filelog-info.log');
      assert.include(logger._names, 'filelog-error.log');
      assert.lengthOf(Object.keys(logger.transports), 2);
    });

    it("should only have one transport when one is removed", function () {
      logger.remove('filelog-error.log');
      assert.include(logger._names, 'filelog-info.log');
      assert.lengthOf(Object.keys(logger.transports), 1);
    });
  });

});
