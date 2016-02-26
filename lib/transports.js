'use strict';

var _ = require('lodash');
var wtransports = require('winston').transports;

//
// Setup all transports as lazy-loaded getters.
//

_.forEach(wtransports, function (name, val) {
  exports[name] = val;
});

exports.Console = require('./transports/console').Console;
