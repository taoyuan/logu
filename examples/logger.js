'use strict';

var logu = require('../');

var logger = new (logu.Logger)({
  transports: [new (logu.transports.Console)()]
});

logger.once('logging', function (log) {
  console.log(log.transport);
  console.log(log.level);
  console.log(log.id);
  console.log(log.message);
  console.log(log.meta);
});

logger.once('logged', function (log) {
  console.log(log.level);
  console.log(log.id);
  console.log(log.message);
  console.log(log.meta);
});


logger.log('info', 'Hello world!');
