'use strict';

var config = exports;

config.levels = {
  error: 0,
  warn: 10,
  help: 20,
  data: 30,
  phase: 40,
  action: 50,
  info: 60,
  debug: 70,
  prompt: 80,
  verbose: 90,
  input: 100,
  silly: 110
};

config.colors = {
  silly: 'magenta',
  input: 'grey',
  verbose: 'grey',
  prompt: 'grey',
  debug: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  error: 'red',
  default: 'cyan'
};
