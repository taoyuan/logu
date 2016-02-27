'use strict';

var fs = require('fs'),
  path = require('path'),
  http = require('http'),
  assert = require('chai').assert,
  logu = require('../lib/logu'),
  s = require('./support');

describe('logu', function () {


  describe("The logu module", function () {

    before(function () {
      logu.default.transports.console.level = 'silly';
    });

    it("should have the correct methods defined", function () {
      assert.isObject(logu.transports);
      assert.isFunction(logu.Transport);
      assert.isTrue(!logu.transports.Transport);
      assert.isFunction(logu.transports.Console);
      assert.isFunction(logu.transports.File);
      assert.isObject(logu.default.transports.console);
      assert.isFalse(logu.emitErrs);
      assert.isObject(logu.config);
      ['Logger', 'add', 'remove', 'extend', 'clear']
        .concat(Object.keys(logu.config.npm.levels))
        .forEach(function (key) {
          assert.isFunction(logu[key]);
        });
    });

    it("should have the correct version set", function () {
      var data = fs.readFileSync(path.join(__dirname, '..', 'package.json'));
      data = JSON.parse(data.toString());
      assert.equal(logu.version, data.version);
    });

    describe('the log() method', function () {
      s.testNpmLevels(logu, "should respond without an error", function (err) {
        assert.isNull(err);
      })
    });
  });
// }).addBatch({
//   "The logu module": {
//     "the setLevels() method": {
//       topic: function () {
//         logu.setLevels(logu.config.syslog.levels);
//         return null;
//       },
//       "should have the proper methods defined": function () {
//         assert.isObject(logu.transports);
//         assert.isFunction(logu.transports.Console);
//         assert.isObject(logu.default.transports.console);
//         assert.isFalse(logu.emitErrs);
//         assert.isObject(logu.config);
//
//         var newLevels = Object.keys(logu.config.syslog.levels);
//         ['Logger', 'add', 'remove', 'extend', 'clear']
//           .concat(newLevels)
//           .forEach(function (key) {
//             assert.isFunction(logu[key]);
//           });
//
//
//         Object.keys(logu.config.npm.levels)
//           .filter(function (key) {
//             return newLevels.indexOf(key) === -1;
//           })
//           .forEach(function (key) {
//             assert.isTrue(typeof logu[key] === 'undefined');
//           });
//       }
//     },
//     "the clone() method": {
//       "with Error object": {
//         topic: function () {
//           var original = new Error("foo");
//           original.name = "bar";
//
//           var copy = logu.clone(original);
//
//           return {original: original, copy: copy};
//         },
//         "should clone the value": function (result) {
//           assert.notEqual(result.original, result.copy);
//           assert.equal(result.original.message, result.copy.message);
//           assert.equal(result.original.name, result.copy.name);
//         }
//       },
//       "with Date object": {
//         topic: function () {
//           var original = new Date(1000);
//
//           var copy = logu.clone(original);
//
//           return {original: original, copy: copy};
//         },
//         "should clone the value": function (result) {
//           assert.notEqual(result.original, result.copy);
//           assert.equal(result.original.getTime(), result.copy.getTime());
//         }
//       }
//     }
//   }
});
