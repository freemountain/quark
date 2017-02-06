#! /usr/bin/env node

const start = require('./index.js');

if (process.argv.length < 3) throw new Error('need at least one argument, package.json');

const pkgJson = process.argv[2];
let appArgs = [];

if (process.argv.length >= 4) appArgs = process.argv.slice(4).join(' ');

const child = start(pkgJson, appArgs);

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

child.on('close', (code) => {
  process.exit(code);
});
