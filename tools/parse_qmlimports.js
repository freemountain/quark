const getStdin = require('get-stdin');

function generateStaticImportPath({ path, plugin }) {
  return path + '/lib' + plugin + '.a';
}

function generateImportMacro({ classname }) {
  return 'Q_IMPORT_PLUGIN(' + classname + ')';
}

function unique(a) {
  const set = new Set(a);
  return Array.from(set);
}

function parse(data) {
  const imports = JSON
    .parse(data)
    .filter(({ type }) => type === 'module')
    .filter(({ name }) => name.startsWith('Qt'))
    .filter(({ path, plugin }) => path !== undefined && plugin !== undefined);

    return unique(imports);
}

getStdin().then(str => {
  var result = parse(str).map(generateImportMacro)

  return unique(result).join('\n')
}).then(result => console.log(result));
