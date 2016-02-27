'use strict';

var delegate = require('delegates');
exports._wtransports = require('winston').transports;

var d = delegate(exports, '_wtransports');
['File', 'Http', 'Memory'].forEach(d.getter.bind(d));

exports.Console = require('./transports/console').Console;
