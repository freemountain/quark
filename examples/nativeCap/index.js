var cap = require('./dist/nativeCap');

module.exports = function(s) {
  return cap.capitalize(s);
}
