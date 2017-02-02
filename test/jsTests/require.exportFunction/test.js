var a = require('./dep.js');

if(a(1) !== 2) throw new Error('fail a');
if(a.addTwo(2) !== 4) throw new Error('fail b');
