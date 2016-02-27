# logu 

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]

> A javascript logging library based on [wiston](https://github.com/winstonjs/winston).

## Installation

```sh
[sudo] npm install logu --save
```

## Usage

### `logu` supports `host`, `id` and `label` for log.

```js
var logu = require('logu');

logu.cli('logu', {host: 'app', colorize: true, timestamp: 'short', showLevel: false, showLabel: true});

logu.log('info', 'Hello, this is a logging event with host', {'foo': 'bar'});
logu.log('info', 'action', 'Hello, this is a logging event with host', {'foo': 'bar'});
logu.log('info', 'build', 'Hello, this is a logging event with host', {'foo': 'bar', 'label': 'logu#*', arr: [1, 2]});
logu.info('say', 'hello', {foo: 'bar'});
```

output:

```
[14:14:33.580] app Hello, this is a logging event with host foo=bar
[14:14:33.585] app            action Hello, this is a logging event with host foo=bar
[14:14:33.586] app logu#*      build Hello, this is a logging event with host foo=bar, label=logu#*, arr=[1, 2]
[14:14:33.587] app               say hello foo=bar
```

### `logu` using one parameter for `logging` and `logged` events.

A sample log parameter of event `logging`:

```js
{
  transport: {...},
  level: 'info',
  id: 'logu',
  message: 'Hello world!',
  meta: {foo: 'bar'}
}

```

A sample log parameter of event `logged`:

```js
{
  transport: {...},
  level: 'info',
  id: 'logu',
  message: 'Hello world!',
  meta: {foo: 'bar'}
}
```

For example:

```js
var logu = require('logu');

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
```


## License

MIT © [taoyuan](https://github.com/taoyuan)

[npm-image]: https://badge.fury.io/js/logu.svg
[npm-url]: https://npmjs.org/package/logu
[travis-image]: https://travis-ci.org/taoyuan/logu.svg?branch=master
[travis-url]: https://travis-ci.org/taoyuan/logu
[daviddm-image]: https://david-dm.org/taoyuan/logu.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/taoyuan/logu
[coveralls-image]: https://coveralls.io/repos/taoyuan/logu/badge.svg
[coveralls-url]: https://coveralls.io/r/taoyuan/logu
