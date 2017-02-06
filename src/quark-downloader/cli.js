#! /usr/bin/env node

const os = require('os');

const commandLineArgs = require('command-line-args');
const downloader = require('./index.js');

const optionDefinitions = [
  { name: 'latest', type: Boolean },
  { name: 'list', type: Boolean },
  { name: 'version', alias: 'v', type: String },
  { name: 'target', alias: 't', type: String, multiple: true, defaultValue: [] },
  { name: 'output', alias: 'o', type: String, defaultValue: './' },
];

const options = commandLineArgs(optionDefinitions);
const print = msg => console.log(msg);

const catchError = (e) => {
  console.error(e.message);
  process.exit(1);
};


if (options.list) {
  downloader.list().then(print).catch(catchError);
}

if (options.latest) {
  downloader.latest().then(print).catch(catchError);
}

if (!options.list && !options.latest) {
  if (options.target.length === 0) options.target.push(downloader.currentTag());
  if (!options.version) throw new Error('version is required');

  downloader.download(options.version, options.target, options.output)
    .then(print)
    .catch(catchError);
}
