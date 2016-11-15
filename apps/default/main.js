const shell = require('quark-shell');
const path = require('path');

require('shelljs/global');

const deployPath = (bundle, pkg, targetBase) => {
  const pkgJson = require(pkg);
  const name = pkgJson.name || 'quark';
  const target = path.join(targetBase, `${name}.app`);
  const pkgBase = path.dirname(pkg);
  const appBase = path.join(target, 'Contents', 'Resources', 'app');

  console.error('pkbBase', pkgBase);
  console.error('appBase', appBase);

  cp('-R', bundle, target);
  rm('-rf', appBase)
  cp('-R', pkgBase, appBase);
}

shell((values, actions, qml, options) => {
  const bundle = path.join(path.dirname(options.shellPath), '..', '..');

  actions.on('data', action => {
    const type = action.type;
    const payload = action.payload;
    if(type === 'startProcess') qml.startProcess(payload);
    if(type === 'deployApp') deployPath(bundle, payload.pkg, payload.target);
  });

  //qml.load(path.join(__dirname, 'index.qml'));
});
