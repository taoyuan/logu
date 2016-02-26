var logu = require('..');

logu.cli('logu', {colorize: true, timestamp: 'short', showLevel: true});

logu.log('info', 'Hello, this is a logging event with host', {'foo': 'bar'});
logu.log('info', 'action', 'Hello, this is a logging event with host', {'foo': 'bar'});
logu.log('info', 'build', 'Hello, this is a logging event with host', {'foo': 'bar', 'label': 'logu#*', arr: [1, 2]});
logu.info({'foo': 'bar'});
