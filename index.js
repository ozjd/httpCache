//Converted from CoffeeScript.

var cacheDir, crypto, fs, http, httpGet, https, mkdirp, path, readCache, ttl, url, writeCache;

crypto = require('crypto');

fs = require('fs');

http = require('http');

https = require('https');

mkdirp = require('mkdirp');

path = require('path');

url = require('url');

cacheDir = '/tmp';

ttl = 3600;

readCache = function(url, callback) {
  var fileObj, hash;
  hash = crypto.createHash('md5');
  hash = hash.update(url);
  hash = hash.digest('hex');
  fileObj = {
    filename: path.format({
      dir: cacheDir,
      base: 'cache-' + hash + '.json'
    })
  };
  return fs.stat(fileObj.filename, function(err, stats) {
    var mtime, now;
    if (err != null) {
      fileObj.res = 'error';
      fileObj.err = err;
      return callback(fileObj);
    } else {
      mtime = new Date(stats.mtime).getTime();
      now = new Date().getTime();
      if ((now - mtime) > (ttl * 1000)) {
        fileObj.res = 'expired';
        return callback(fileObj);
      } else {
        return fs.readFile(fileObj.filename, 'utf8', function(err, data) {
          if (err != null) {
            fileObj.res = 'error';
            fileObj.err = err;
            return callback(fileObj);
          } else {
            fileObj.res = 'success';
            fileObj.data = JSON.parse(data);
            fileObj.data.wasCached = true;
            return callback(fileObj);
          }
        });
      }
    }
  });
};

writeCache = function(filename, data, callback) {
  var result;
  result = {
    filename: filename,
    data: data,
    res: 'error'
  };
  return fs.stat(cacheDir, function(err, stats) {
    if (err != null) {
      if (err.code === 'ENOENT') {
        return mkdirp(cacheDir, function(err) {
          if (err != null) {
            result.err = err;
            return callback(result);
          } else {
            result.res = 'retry';
            return callback(result);
          }
        });
      } else {
        result.err = err;
        return callback(result);
      }
    } else if (stats.isDirectory() === false) {
      result.err = 'Cache directory is not a directory.';
      return callback(result);
    } else {
      result.data.isCached = true;
      return fs.writeFile(filename, JSON.stringify(data), function(err) {
        if (err != null) {
          result.err = err;
          result.data.isCached = false;
          return callback(result);
        } else {
          result.res = 'success';
          return callback(result);
        }
      });
    }
  });
};

httpGet = function(uri, filename, options, callback) {
  var data, httpCallback, req;
  data = new String();
  httpCallback = function(res) {
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      return data += chunk;
    });
    return res.on('end', function() {
      var result, writeHandler;
      result = {
        statusCode: res.statusCode,
        uri: uri,
        headers: res.headers,
        content: data,
        filename: filename,
        wasCached: false,
        isCached: false,
        mtime: new Date().getTime()
      };
      writeHandler = function(writeRes) {
        if (writeRes.res === 'retry') {
          return writeCache(filename, result, writeHandler);
        } else {
          return callback(writeRes.data);
        }
      };
      if (res.statusCode === 200) {
        return writeCache(filename, result, writeHandler);
      } else {
        return callback(result);
      }
    });
  };
  if (options.protocol === 'http:') {
    req = http.request(options, httpCallback);
  } else if (options.protocol === 'https:') {
    req = https.request(options, httpCallback);
  } else {
    throw new Error('Protocol "' + options.protocol + '" not supported.');
  }
  req.on('error', function(err) {
    return callback({
      uri: uri,
      err: err
    });
  });
  if (options.postData != null) {
    req.write(options.postData);
  }
  return req.end();
};

module.exports = function(options) {
  if (options != null) {
    cacheDir = options.cacheDir || cacheDir;
    ttl = options.ttl || ttl;
  }
  return function(options, callback) {
    var uri;
    if (typeof options === 'string') {
      options = url.parse(options);
    }
    uri = url.format(options);
    return readCache(uri, function(fileObj) {
      if (fileObj.res === 'success') {
        return callback(fileObj.data);
      } else {
        return httpGet(uri, fileObj.filename, options, function(obj) {
          return callback(obj);
        });
      }
    });
  };
};
