var fs    = require('fs');
var path  = require('path');
var mkdirp = require('mkdirp');
var request = require('request');
var sortObj = require('sort-object');
var pkg = require('../package');

// First, look for the download link.
/*jshint maxlen:false */
var dir, filePath, isWin;
var regexp = /https:\/\/yt-dl\.org\/downloads\/(\d{4}\.\d\d\.\d\d(\.\d)?)\/youtube-dl/;
var url = 'https://rg3.github.io/youtube-dl/download.html';

function download(link, callback) {

  'use strict';
  var downloadFile = request.get(link);
  var status = null;

  downloadFile.on('response', function response(res) {
    if (res.statusCode !== 200) {
      status = new Error('Response Error: ' + res.statusCode);
      return;
    }
    downloadFile.pipe(fs.createWriteStream(filePath, {mode: 457}));
  });

  downloadFile.on('error', function error(err) { callback(err); });

  downloadFile.on('end', function end() { callback(status); });

}

function createBase(binDir) {
  'use strict';
  isWin = (process.platform === 'win32' || process.env.NODE_PLATFORM === 'windows') ? true : false;
  dir = (binDir) ? binDir : path.join(__dirname, '..', 'bin');
  mkdirp.sync(dir, {mode: 484});
  filePath = path.join(dir, 'youtube-dl' + ((isWin) ? '.exe' : ''));
}

function addToPkg() {
  'use strict';
  var list = Object.keys(pkg);
  list.splice(list.indexOf('main') + 1, 0, 'bin');
  pkg.bin = filePath;
  pkg = sortObj(pkg, list);

  try {
    fs.writeFileSync(path.join(__dirname, '..', 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
  }
  catch(error) {
    console.log(error);
  }
}

function downloader(binDir, callback) {

  'use strict';
  if (typeof binDir === 'function') {
    callback = binDir;
    binDir = null;
  }

  createBase(binDir);

  request.get(url, function get(err, res, body) {

    if (err || res.statusCode !== 200) { return callback(err || new Error('Response Error: ' + res.statusCode)); }

    var m = regexp.exec(body);

    if (!m) { return callback(new Error('Could not find download link in ' + url)); }

    // Check if there is a new version available.
    var newVersion = m[1];
    var verpath  = path.join(dir, 'version');
    var oldVersion = fs.existsSync(verpath) && fs.readFileSync(verpath, 'utf8');

    if (newVersion === oldVersion) { return callback(null, 'Already up to date ' + newVersion); }

    var link = m[0];
    if (isWin) { link += '.exe'; }

    download(link, function error(err) {
      if (err) { return callback(err); }
      fs.writeFileSync(verpath, newVersion);
      addToPkg();
      callback(null, 'Downloaded youtube-dl ' + newVersion);
    });

  });

}

module.exports = downloader;
