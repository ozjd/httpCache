#Setup...
cache = require('../index.coffee')
  cacheDir: './cache'
  ttl: 3600 #Maximum 5 minutes (3600s) in cache
#Run!
cache 'http://example.com/', (obj) ->
  console.dir obj
