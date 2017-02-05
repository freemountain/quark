const http = require('https');
const fs = require('fs');

const fetch = require('node-fetch');
const moment = require('moment');

const download = function(url, dest) {
  const file = fs.createWriteStream(dest);
  const request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

const dl = (url, dest) => new Promise((resolve, reject) => {
  const file = fs.createWriteStream(dest);
  const request = http.get(url, response => response.pipe(file));

  file.on('finish', () => file.close(resolve));
  request.on('error', err => {
    fs.unlink(dest);
    reject(err)
  });
})

const _dl = (url, dest) => {

  return fetch(url).then(response => {
    const file = fs.createWriteStream(dest);

    response.pipe(file)
  });
}

const sortRelease = (a, b) => a.published.unix() < b.published.unix();
const filterRelease = ({ prerelease, draft }) => !draft && !prerelease;

const mapResponse = response => {
  if(response.ok) return response.json();
  throw new Error(`could not find ${response.url}`);
}

const mapRelease = json => {
  return {
    id: json.id,
    tag: json.tag_name,
    name: json.name,
    desc: json.body,
    created: moment(json.created_at),
    published: moment(json.published_at),
    assets: json.assets.map(mapAsset)
  };
}

const mapAsset = json => {
  return {
    id: json.id,
    name: json.name,
    label: json.label,
    contentType: json.content_type,
    created: moment(json.created_at),
    published: moment(json.published_at),
    downloadUrl: json.browser_download_url
  }
}

const getReleases = (user, repo) => fetch(`https://api.github.com/repos/${user}/${repo}/releases`)
  .then(mapResponse)
  .then(json => json
    .filter(filterRelease)
    .map(mapRelease)
    .sort(sortRelease)
  );

const getRelease = (user, repo, id) => fetch(`https://api.github.com/repos/${user}/${repo}/releases/${id}`)
  .then(mapResponse)
  .then(mapRelease);

const getLatestRelease = (user, repo) => getRelease(user, repo, 'latest')

const getReleaseByTag = (user, repo, tag) => fetch(`https://api.github.com/repos/${user}/${repo}/releases/tags/${tag}`)
  .then(mapResponse)
  .then(mapRelease);

const downloadQuark = (version, destination, os = ['linux', 'mac', 'win']) => {
  return getReleaseByTag('freemountain', 'quark', version)
    .then(release => console.log(release));
}

const downloadArtifacts = ({user, repo, tag, path, filterAssets}) => {
  const filter = filterAssets ||(() => true);

  return getReleaseByTag(user, repo, tag)
    .then(release => release.assets.filter(filter))
    .then(assets => Promise.all(assets.map(
      ({downloadUrl, name}) => _dl(downloadUrl, path + '/' + name))
    ))
}

downloadArtifacts({
  user: 'freemountain',
  repo: 'quark',
  tag: 'v20170402',
  path: './download',
  filterAssets: asset => asset.name.startsWith('quark-shell') && asset.name.endsWith('.zip')
}).then(release => console.log(release));
