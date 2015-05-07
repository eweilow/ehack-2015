var express = require('express');
var fs = require('fs');
var app = require('../app');
var path = require('path');
var router = express.Router();

function handle_data(app, data, id, files) {
	console.log(data);
	var connection = app.get('connection');
	data.readings.forEach(function(readout) {
		if (!readout.temperature) {
			return;
		}
		connection.query("INSERT INTO temperaturereading(nodeid, reading, unixmilliseconds) VALUES(?, ?, ?)", [id, readout.temperature, readout.time], function(err) {
			console.log(err);
		});
	});
}

router.put('/:node_id', function(req, res, next) {
	console.log(req.body);
	if (req.busboy) {
		var reading_data = "";
		req.busboy.on('file', function (fieldname, stream, filename) {
			if (filename == "readings.json") {
				stream.on('data', function(data) {
					reading_data += data;
				})
				stream.resume();
			} else {
				var file = fs.createWriteStream("received_files/" + req.params.node_id + "-" + path.basename(filename));
				stream.on('data', function(data) {
					file.write(data);
				})
				stream.on('end', function() {
					file.end();
				})
				stream.resume();
			}
			console.log(filename, fieldname);
		});
		req.busboy.on('finish', function() {
			console.log(reading_data);
			handle_data(req.app, JSON.parse(reading_data), req.params.node_id, req.params.node_id, [])
			res.end();
		})
		req.pipe(req.busboy);
	} else {
		handle_data(req.app, req.body, req.params.node_id, [])
		res.end();
	}
});

module.exports = router;
