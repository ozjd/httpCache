# httpCache

We use many HTTP/HTTPS APIs, so I've created this to store HTTP/HTTPS calls in a cache folder for a period of time (ttl).

If there are permission issues, httpCache will not fail, and will instead just run the HTTP request (check isCached and wasCached properties on a successful call)

The current config options are 'ttl' (time to live) and 'cacheDir' (self explanitory).

You can call a URL with an Object or a String (see Node's [http.request()](https://nodejs.org/api/http.html#http_http_request_options_callback)

See examples directory for usage (try them).

Examples and Source are written in Javascript and CoffeeScript (independant of each other)

If you use this project, please contribute.

The number one contribution right now would be an update to this README.md file, with simple usage instructions and information about the returned object.

Thanks,
JD
