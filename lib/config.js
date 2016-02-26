'use strict';

var config = module.exports = require('winston').config;

config.cli = require('./config/cli-config');

config.addColors(config.cli.colors);
