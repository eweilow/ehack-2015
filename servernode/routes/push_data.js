var express = require('express');
var fs = require('fs');
var app = require('../app');
var path = require('path');
var router = express.Router();

function handle_data(app, data, files) {
	var connection = app.get('connection');
	connection.query("SELECT 1 + 1 AS solution", function(err, data) {
		console.log(err);
		console.log(data);
	});
}

router.put('/', function(req, res, next) {
	console.log(req.body);
	if (req.busboy) {
		req.busboy.on('file', function (fieldname, stream, filename) {
			var file = fs.createWriteStream("received_files/" + req.body.node_id + "-" + path.basename(filename));
			stream.on('data', function(data) {
				file.write(data);
			})
			stream.on('end', function() {
				file.end();
			})
			stream.resume();
			console.log(filename, fieldname);
		});
		req.busboy.on('finish', function() {
			handle_data(req.app, req.body, [])
			res.end();
		})
		req.pipe(req.busboy);
	} else {
		handle_data(req.app, req.body, [])
		res.end();
	}
});

module.exports = router;
