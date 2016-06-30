/**
 * Development server for serving the orangechat.io frontend
 * Warning - do not use publically, there is no security in this server!
 *
 * Usage:
 * 	$ npm start
 * 	$ PORT=8080 npm start
 */

var http = require('http');
var fs = require('fs');
var path = require('path');

var base_path = __dirname + '/public';
var server_port = process.env.PORT || 8000;

http.createServer(function(req, res) {
	if (req.url === '/') {
		req.url = '/index.html';
	}

    var stream = fs.createReadStream(path.join(base_path, req.url));
    stream.on('error', function() {
        res.writeHead(404);
        res.end();
    });
    stream.pipe(res);
}).listen(server_port);

console.log('This is a local development server only - do not use publically!');
console.log('Orangechat httpd listening at 0.0.0.0:%d...', server_port);
