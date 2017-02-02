var iterations = 1e6;

function benchmark(name, array) {
  console.log(name + ':');
  var time, i, tmp;

  time = -Date.now();

  for (i = 0; i < iterations; i++)
    array[i%99] = 42;

  time += Date.now();
  console.log('     set %s ops/ms', (iterations / time) | 0);

  time = -Date.now();

  for (i = 0; i < iterations; i++)
    tmp = array[i%99]

  time += Date.now();
  console.log('     get %s ops/ms', (iterations / time) | 0, "\n");

}

var time = -Date.now();
benchmark('{}', {});
benchmark('[]', []);
benchmark('Uint8Array', new Uint8Array(100));
benchmark('Float64Array', new Float64Array(100));
time += Date.now();

console.log("Duration: ", ((time/10)|0)/100);
