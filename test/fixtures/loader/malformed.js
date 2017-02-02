var depA = require('./someDep.js');
var depB = require('./someDep');

module.exports = function(t) {
  console.log('test args', t.assert);
  t.assert(true);
  t.assert(false);
};
