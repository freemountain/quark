var a = require('./dep.js');
var b = require('./dep');
var t = require('../testLib');

t.assertDeepEqual(a, b);
