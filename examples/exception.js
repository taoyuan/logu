var logu = require('..');
var transports = require('../').transports;
logu.handleExceptions(new transports.Console({colorize: true, json: true}));

throw new Error('Hello, logu!');
