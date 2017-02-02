var process = require('process');
var timers = require('timers');

process.nextTick(function(n) {
  process.send(n);
}, 1);

timers.setTimeout(function(n) {
  process.send(n);
}, 300, 2)

var id = timers.setTimeout(function(n) {
  process.send(n);
}, 10, 1000);

process.send(0);
timers.clearTimeout(id);
