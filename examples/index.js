//Setup...
cache = require('../index.js')({
  cacheDir: './cache',
  ttl: 3600 //Maximum 5 minutes (3600s) in cache
});
//Run!
cache("http://www.example.com/", function(obj) {
  console.dir(obj);
});
