var fs = require('fs');
var assert = require('assert');

var data = fs.readFileSync(__dirname + '/../../fixtures/greekAnthem.utf8.txt', 'utf8');
var expected = 'Σὲ γνωρίζω ἀπὸ τὴν κόψη\nτοῦ σπαθιοῦ τὴν τρομερή,\nσὲ γνωρίζω ἀπὸ τὴν ὄψη\nποὺ μὲ βία μετράει τὴ γῆ.\n';

assert.equal(data, expected);
