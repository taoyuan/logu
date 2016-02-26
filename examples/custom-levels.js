var logu = require('..');

//
// Logging levels
//
var config = {
  levels: {
    error: 0,
    debug: 1,
    warn: 2,
    data: 3,
    info: 4,
    verbose: 5,
    silly: 6
  },
  colors: {
    error: 'red',
    debug: 'blue',
    warn: 'yellow',
    data: 'grey',
    info: 'green',
    verbose: 'cyan',
    silly: 'magenta'
  }
};

var logger = module.exports = new (logu.Logger)({
  transports: [
    new (logu.transports.Console)({
      colorize: true
    })
  ],
  levels: config.levels,
  colors: config.colors
});

logger.data('hello');
