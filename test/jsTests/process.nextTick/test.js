var process = require('process');

process.nextTick(function(n) {
  process.send(n);
}, 1);

process.send(0);
