var _ = require('lodash');
var util = require('util');
var cycle = require('cycle');
var chalk = require('chalk');
chalk.enabled = true;
var stripColors = require('strip-ansi');
var df = require('./df');
var config = require('./config');

exports.Renderer = Renderer;

function Renderer(options) {
  options = options || {};
  this._sizes = _.assign({
    id: 10,    // Id max chars
    label: 8, // Label max chars
    level: 6,
    sumup: 5   // Amount to sum when the label exceeds
  }, options.sizes);
  this._compact = process.stdout.columns < 120;
}

//
// ### function log (log)
// #### @log {Object} All information about the log serialization.
// Generic logging function for returning timestamped strings
// with the following log:
//
//    {
//      level:     'level to add to serialized message',
//      id:        'id to prepend the message'
//      label:     'label to prepend the message'
//      msg:       'message to serialize',
//      data:      'additional logging metadata to serialize',
//      colorize:  false, // Colorizes output (only if `.json` is false)
//      timestamp: true   // Adds a timestamp to the serialized message
//    }
//
Renderer.prototype.render = function (log) {
  var timestamp;
  if (typeof log.timestamp === 'function') {
    timestamp = log.timestamp();
  } else if (log.timestamp) {
    timestamp = makeTimestamp(log.timestamp);
  }

  // decycle non-error object data
  log.data = log.data !== null && log.data !== undefined && !(log.data instanceof Error)
    ? clone(cycle.decycle(log.data)) : log.data || null;

  //
  // raw mode is intended for outputing logu as streaming JSON to STDOUT
  //
  if (log.raw) {
    return this.renderRaw(timestamp, log);
  }

  //
  // json mode is intended for pretty printing multi-line json to the terminal
  //
  if (log.json || true === log.logstash) {
    return this.renderJson(timestamp, log);
  }

  return this.renderString(timestamp, log);
};

Renderer.prototype.renderRaw = function (timestamp, log) {
  var output;
  var data = log.data;
  if (typeof data !== 'object' && data != null) {
    data = {data: data};
  }
  output = clone(data) || {};
  if (timestamp) output.timestamp = stripColors(timestamp);
  if (log.id) output.id = log.id;
  if (log.label) output.label = log.label;
  output.level = log.level;
  output.message = stripColors(log.message);
  return JSON.stringify(output);
};

Renderer.prototype.renderJson = function (timestamp, log) {
  var output;

  var data = log.data;
  if (typeof data !== 'object' && data != null) {
    data = {data: data};
  }

  output = clone(data) || {};
  output.level = log.level;
  output.message = log.message;
  if (log.id) output.id = log.id;
  if (log.label) output.label = log.label;
  if (timestamp) output.timestamp = timestamp;

  if (log.logstash === true) {
    // use logstash format
    var logstashOutput = {};
    if (output.message !== undefined) {
      logstashOutput['@message'] = output.message;
      delete output.message;
    }

    if (output.timestamp !== undefined) {
      logstashOutput['@timestamp'] = output.timestamp;
      delete output.timestamp;
    }

    logstashOutput['@fields'] = clone(output);
    output = logstashOutput;
  }

  if (typeof log.stringify === 'function') {
    return log.stringify(output);
  }

  return JSON.stringify(output, function (key, value) {
    return value instanceof Buffer
      ? value.toString('base64')
      : value;
  });
};


Renderer.prototype.renderString = function (timestamp, log) {
  //
  // Remark: this should really be a call to `util.format`.
  //
  if (typeof log.formatter == 'function') {
    return String(log.formatter(clone(log)));
  }

  var output, nrSpaces;
  var data = log.data;
  var colorize = log.colorize ? config.colorize : function (level, message) {
    return message || level;
  };
  var showLevel = log.showLevel === undefined ? true : log.showLevel;

  output = timestamp ? chalk.grey('[' + timestamp + ']') + ' ' : '';
  output += log.host ? (log.host + ' ') : '';

  if (showLevel) {
    var level = log.level + ':';

    var size = this._sizes.level = Math.max(this._sizes.level, level.length);
    nrSpaces = size - level.length + 1; // +1 for one space

    level = log.colorize === 'all' || log.colorize === 'level' || log.colorize === true
      ? config.colorize(log.level, level) : level;
    output += level + _.repeat(' ', nrSpaces);
  }

  var label = log.label || '';
  var id = log.id;

  if (id) {
    if (this._compact || !log.showLabel) {
      // If there's not enough space for the id, adjust it
      // for subsequent logs
      if (id.length > this._sizes.id) {
        this._sizes.id = id.length += this._sizes.sumup;
      }

      output += colorize(log.level, _.padEnd(id, this._sizes.id)) + ' ';
    } else {
      // Construct the label
      var length = id.length + label.length + 1;
      nrSpaces = this._sizes.id + this._sizes.label - length;

      // Ensure at least one space between the label and the id
      if (nrSpaces < 1) {
        // Also adjust the label size for subsequent logs
        this._sizes.label = label.length + this._sizes.sumup;
        nrSpaces = this._sizes.id + this._sizes.label - length;
      }

      output += chalk.green(label) + _.repeat(' ', nrSpaces) + colorize(log.level, id) + ' ';
    }
  }


  output += log.colorize === 'all' || log.colorize === 'message'
    ? config.colorize(log.level, log.message)
    : log.message;

  var prefix = '';
  if (data !== null && data !== undefined) {
    if (data && data instanceof Error && data.stack) {
      data = data.stack;
    }

    if (output[output.length - 1] !== ' ') {
      prefix = ' ';
    }

    if (typeof data !== 'object') {
      output += prefix + data;
    } else if (Object.keys(data).length > 0) {
      if (typeof log.prettyPrint === 'function') {
        output += prefix + log.prettyPrint(data);
      } else if (log.prettyPrint) {
        output += '\n' + util.inspect(data, false, log.depth || null, log.colorize);
      } else if (
        log.humanReadableUnhandledException
        && Object.keys(data).length === 5
        && data.hasOwnProperty('date')
        && data.hasOwnProperty('process')
        && data.hasOwnProperty('os')
        && data.hasOwnProperty('trace')
        && data.hasOwnProperty('stack')) {

        //
        // If data carries unhandled exception data serialize the stack nicely
        //
        var stack = data.stack;
        delete data.stack;
        delete data.trace;
        output += prefix + this.serialize(data);

        if (stack) {
          output += '\n' + stack.join('\n');
        }
      } else {
        output += prefix + this.serialize(data);
      }
    }
  }

  return output;
};

Renderer.prototype.serialize = function (obj, key) {
  // symbols cannot be directly casted to strings
  if (typeof key === 'symbol') {
    key = key.toString()
  }
  if (typeof obj === 'symbol') {
    obj = obj.toString()
  }

  if (obj === null) {
    obj = 'null';
  }
  else if (obj === undefined) {
    obj = 'undefined';
  }
  else if (obj === false) {
    obj = 'false';
  }

  if (typeof obj !== 'object') {
    return key ? key + '=' + obj : obj;
  }

  if (obj instanceof Buffer) {
    return key ? key + '=' + obj.toString('base64') : obj.toString('base64');
  }

  var msg = '',
    keys = Object.keys(obj),
    length = keys.length;

  for (var i = 0; i < length; i++) {
    if (Array.isArray(obj[keys[i]])) {
      msg += keys[i] + '=[';

      for (var j = 0, l = obj[keys[i]].length; j < l; j++) {
        msg += this.serialize(obj[keys[i]][j]);
        if (j < l - 1) {
          msg += ', ';
        }
      }

      msg += ']';
    }
    else if (obj[keys[i]] instanceof Date) {
      msg += keys[i] + '=' + obj[keys[i]];
    }
    else {
      msg += this.serialize(obj[keys[i]], keys[i]);
    }

    if (i < length - 1) {
      msg += ', ';
    }
  }

  return msg;
};

function clone(obj) {
  //
  // We only need to clone reference types (Object)
  //
  var copy = {};

  if (obj instanceof Error) {
    // With potential custom Error objects, this might not be exactly correct,
    // but probably close-enough for purposes of this lib.
    copy = { message: obj.message };
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      copy[key] = obj[key];
    });

    return copy;
  }
  else if (!(obj instanceof Object)) {
    return obj;
  }
  else if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  for (var i in obj) {
    if (Array.isArray(obj[i])) {
      copy[i] = obj[i].slice(0);
    }
    else if (obj[i] instanceof Buffer) {
      copy[i] = obj[i].slice(0);
    }
    else if (typeof obj[i] != 'function') {
      copy[i] = obj[i] instanceof Object ? clone(obj[i]) : obj[i];
    }
    else if (typeof obj[i] === 'function') {
      copy[i] = obj[i];
    }
  }

  return copy;
}


function makeTimestamp(format) {
  if (typeof format === 'string') {
    format = df[format.toUpperCase()] || format;
  } else {
    format = df.SHORT;
  }
  return df.asString(format, new Date());
}
