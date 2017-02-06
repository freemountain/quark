const fs = require('fs');
const path = require('path');
const os = require('os');
const parseUrl = require('url').parse;
const fetch = require('node-fetch');
const moment = require('moment');
const unzip = require('unzipper');
const tmp = require('tmp');
const chmod = require('chmod');

const log = (msg, silent) => (x) => {
  if (!silent) console.log(msg);
  return x;
};

const ls = dir => new Promise((resolve, reject) => {
  fs.readdir(dir, (err, files) => {
    if (err) return reject(err);

    return resolve(files);
  });
});

const chmodBundle = (bundle) => {
  const names = ['QuarkShell', 'QuarkShell.exe', 'node', 'node.exe', 'AppRun'];
  const filterFiles = files => files.filter(name => names.includes(name));
  const permission = { read: true, execute: true };
  const permissions = { owner: permission, group: permission, others: permission };

  const searchPath = path.basename(bundle).endsWith('.app')
    ? path.join(bundle, 'Contents', 'MacOS')
    : bundle;

  const mapFiles = files => files.map(file => path.join(searchPath, file));

  return ls(searchPath)
    .then(filterFiles)
    .then(mapFiles)
    .then(files => files.map(file => chmod(file, permissions)))
    .then(() => bundle);
};

const chmodRelease = dir => ls(dir).then((p) => {
  const name = p.includes('QuarkShell.app') ? 'QuarkShell.app' : 'QuarkShell';

  return chmodBundle(path.join(dir, name));
});


const tmpFileCreator = mayFile => new Promise((resolve, reject) => {
  if (mayFile) return resolve(mayFile);

  return tmp.file({ unsafeCleanup: true }, (err, p) => {
    if (err) return reject(err);
    return resolve(p);
  });
});

const extractZip = (file, destination) => new Promise((resolve, reject) => {
  const archive = fs.createReadStream(file);
  const extract = archive.pipe(unzip.Extract({ path: destination }));

  archive.on('error', err => reject(err));
  extract.on('error', err => reject(err));
  extract.on('close', () => resolve(destination));
});

const httpError = (response) => {
  const error = new Error(`ResponseError ${response.status} (url: ${response.url})`);

  return error;
};

const saveResponse = dest => response => new Promise((resolve, reject) => {
  if (!response.ok) { return reject(httpError(response)); }

  const file = fs.createWriteStream(dest);
  file.on('finish', () => resolve(dest));
  file.on('error', err => reject(err));

  return response.body.pipe(file);
});

const sortRelease = (a, b) => a.published.unix() < b.published.unix();
const filterRelease = ({ prerelease, draft }) => !draft && !prerelease;

const mapResponse = (response) => {
  if (!response.ok) throw httpError(response);

  return response.json();
};

const mapAssets = assets => assets
  .filter(({ name }) => name.startsWith('quark-shell-') && name.endsWith('.zip'))
  .map(asset => ({
    id: asset.id,
    name: asset.name,
    label: asset.label,
    contentType: asset.content_type,
    created: moment(asset.created_at),
    published: moment(asset.published_at),
    downloadUrl: asset.browser_download_url,
  }));

const mapRelease = json => ({
  id: json.id,
  tag: json.tag_name,
  name: json.name,
  desc: json.body,
  created: moment(json.created_at),
  published: moment(json.published_at),
  assets: mapAssets(json.assets),
});

const getReleases = (user, repo) => fetch(`https://api.github.com/repos/${user}/${repo}/releases`)
  .then(mapResponse)
  .then(json => json
    .filter(filterRelease)
    .map(mapRelease)
    .sort(sortRelease));


const getRelease = (user, repo, id) => fetch(`https://api.github.com/repos/${user}/${repo}/releases/${id}`)
  .then(mapResponse)
  .then(mapRelease);

const getLatestRelease = (user, repo) => getRelease(user, repo, 'latest');

const getReleaseByTag = (user, repo, tag) => fetch(`https://api.github.com/repos/${user}/${repo}/releases/tags/${tag}`)
  .then(mapResponse)
  .then(mapRelease);

const urlToDebugName = u => {
  const urlPathStr = parseUrl(u).path;
  const urlPath = path.parse(urlPathStr);
  const fileName = urlPath.base;
  const pathTokens = urlPath.dir.split('/');
  const version = pathTokens[pathTokens.length -1];

  return `${version}/${fileName}`;
}

const downloadAndExtract = (url, destination, mayTmp, silent = false) => tmpFileCreator(mayTmp)
  .then(downloadDest => fetch(url)
    .then(log(`downloading ${urlToDebugName(url)}`, silent))
    .then(saveResponse(downloadDest))
    .then(() => downloadDest)
    .then(log(`extracting ${urlToDebugName(url)}`, silent)))
  .then(archive => extractZip(archive, destination));


const filterAssets = target => ({ assets }) => {
  const single = t => ({ name }) => name.startsWith(`quark-shell-${t}`) && name.endsWith('.zip');
  const multi = name => target.map(single).some(c => c(name));
  const filter = typeof target === 'string' ? single(target) : multi;

  return assets.filter(filter);
};
const assetNameToTarget = name => name.slice('quark-shell'.length + 1, -'.zip'.length);

const download = (version, targets, destination) => getReleaseByTag('freemountain', 'quark', version)
  .then(filterAssets(targets))
  .then((assets) => {
    const excpected = [].concat(targets).length;
    if (assets.length !== excpected) throw new Error(`Excpected ${excpected} assets (${targets}). Found ${assets.length} assets (${assets})`);

    return assets;
  })
  .then(assets => Promise.all(assets.map(({ name, downloadUrl }) => {
    const dest = typeof targets === 'string' ? destination : path.join(destination, assetNameToTarget(name));

    return downloadAndExtract(downloadUrl, dest).then(chmodRelease);
  })));

const createVersionInfo = release => ({
  version: release.tag,
  targets: release.assets.map(asset => assetNameToTarget(asset.name)),
});

const list = () => getReleases('freemountain', 'quark')
    .then(releases => releases.map(createVersionInfo).filter(({ targets }) => targets.length > 0));

const latest = () => getLatestRelease('freemountain', 'quark').then(createVersionInfo);

const mapOs = (osName) => {
  switch (osName) {
    case 'Linux': return 'linux';
    case 'Darwin': return 'mac';
    case 'Windows_NT': return 'windows';
    default: throw new Error(`${os} is not supported`);
  }
};

const mapArch = (arch) => {
  switch (arch) {
    case 'x64': return 'x86_64';
    case 'x86': return 'x86';
    case 'x32': return 'x86';
    default: throw new Error(`${arch} is not supported`);
  }
};

module.exports = {
  currentTag: () => `${mapOs(os.type())}-${mapArch(os.arch())}`,
  download,
  list,
  latest,
};

// download('v20170402', ['linux-x86_64', 'mac-x86_64'], './multi').then(w => console.log('multi', w));
// download('v20170402', 'win-x86', './single').then(w => console.log('single', w));
