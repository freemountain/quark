var fs = require('fs');
var assert = require('assert');

var expectedAnthem = 'Σὲ γνωρίζω ἀπὸ τὴν κόψη\nτοῦ σπαθιοῦ τὴν τρομερή,\nσὲ γνωρίζω ἀπὸ τὴν ὄψη\nποὺ μὲ βία μετράει τὴ γῆ.\n';

fs.readFile(__dirname + '/../../fixtures/greekAnthem.utf8.txt', 'utf8', function(err, data) {
  if(err) throw err;
  assert.equal(expectedAnthem, data);
});

fs.readFile(__dirname + '/../../fixtures/greekLipsum.greek.txt', 'greek', function(err, data) {
  if(err) throw err;
  assert.equal(expectedAnthem, data);
});
