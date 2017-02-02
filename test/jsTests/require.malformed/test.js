var t = require('../testLib');

var result;
var failed = false;

try {
  result = require('./dep.js');
} catch(e) {
  result = e;
  failed = true;
}

t.assert(failed);
