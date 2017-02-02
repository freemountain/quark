var someDep = require('./lib/someDep.js');
var someDepJs = require('./lib/someDep');

module.exports = function(t) {
  t.assertDeepEqual(someDep, someDepJs);
};
