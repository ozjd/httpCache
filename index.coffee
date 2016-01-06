crypto = require 'crypto'
fs = require 'fs'
http = require 'http'
https = require 'https'
mkdirp = require 'mkdirp'
path = require 'path'
url = require 'url'

#Defaults..
cacheDir = '/tmp'
ttl = 3600

readCache = (url, callback) ->
  hash = crypto.createHash 'md5'
  hash = hash.update url
  hash = hash.digest 'hex'
  fileObj =
    filename: path.format
      dir: cacheDir,
      base: 'cache-' + hash + '.json'
  fs.stat fileObj.filename, (err, stats) ->
    if err?
      fileObj.res = 'error'
      fileObj.err = err
      callback fileObj
    else
      mtime = new Date(stats.mtime).getTime()
      now = new Date().getTime()
      if (now - mtime) > (ttl * 1000) #Last modified too long ago (Past TTL)
        fileObj.res = 'expired'
        callback fileObj
      else
        fs.readFile fileObj.filename, 'utf8', (err, data) ->
          if err?
            fileObj.res = 'error'
            fileObj.err = err
            callback fileObj
          else
            fileObj.res = 'success'
            fileObj.data = JSON.parse(data); #TODO: Error check?
            fileObj.data.wasCached = true
            callback fileObj

writeCache = (filename, data, callback) ->
  result =
    filename: filename
    data: data
    res: 'error'
  fs.stat cacheDir, (err, stats) ->
    if err?
      if err.code is 'ENOENT'
        mkdirp cacheDir, (err) ->
          if err?
            result.err = err
            callback result
          else #We made a new directory.
            result.res = 'retry'
            callback result
      else
        result.err = err
        callback result
    else if stats.isDirectory() is false
        result.err = 'Cache directory is not a directory.'
        callback result
    else
      result.data.isCached = true
      fs.writeFile filename, JSON.stringify(data), (err) ->
        if err?
          result.err = err
          result.data.isCached = false
          callback result
        else
          result.res = 'success'
          callback result

httpGet = (uri, filename, options, callback) ->
  data = new String()
  httpCallback = (res) ->
    res.setEncoding 'utf8'
    res.on 'data', (chunk) ->
      data += chunk
    res.on 'end', () ->
      result =
        statusCode: res.statusCode
        uri: uri
        headers: res.headers
        content: data
        filename: filename
        wasCached: false
        isCached: false
        mtime: new Date().getTime()
      writeHandler = (writeRes) ->
        if writeRes.res is 'retry'
          writeCache filename, result, writeHandler
        else
          callback writeRes.data
      if res.statusCode is 200
        writeCache filename, result, writeHandler
      else
        callback result
  if options.protocol is 'http:'
    req = http.request options, httpCallback
  else if options.protocol is 'https:'
    req = https.request options, httpCallback
  else
    throw new Error 'Protocol "' + options.protocol + '" not supported.'
  req.on 'error', (err) ->
    callback
      uri: uri
      err: err
  if options.postData?
    req.write options.postData
  req.end()

module.exports = (options) -> #Require call.
  if options?
    cacheDir = options.cacheDir || cacheDir
    ttl = options.ttl || ttl
  (options, callback) -> #see options in http.get (+ postData)
    if typeof options is 'string'
      options = url.parse options
    uri = url.format options
    readCache uri, (fileObj) ->
      if fileObj.res is 'success' #We have cached data!
        callback fileObj.data
      else #No cached data, let's try and get it!
        httpGet uri, fileObj.filename, options, (obj) ->
          #Check for err.
          callback obj
# uri: string
# headers: object
# data: string
# wasCached: boolean
# isCached: boolean
# filename: string
# mtime: string
