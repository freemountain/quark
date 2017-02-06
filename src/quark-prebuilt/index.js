const os = require('os');
const path = require('path');

const spawn = require('child_process').spawn;

const downloader = require('quark-downloader');

const getBin = (osName = os.type()) => {
  switch (osName) {
    case 'Linux': return 'QuarkShell/QuarkShell';
    case 'Darwin': return 'QuarkShell.app/Contents/MacOS/QuarkShell';
    case 'Windows_NT': return 'QuarkShell\\QuarkShell.exe';
    default: throw new Error(`${os} is not supported`);
  }
};

const start = (pkgJson, appArguments = []) => {
  const currentTag = downloader.currentTag();
  const quarkBin = path.join(__dirname, 'lib', currentTag, getBin());

  const args = [pkgJson, '--'].concat(appArguments);

  return spawn(quarkBin, args);
};

module.exports = start;
