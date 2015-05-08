var express = require('express');
var fs = require('fs');
var app = require('../app');
var path = require('path');
var nodes = require('../nodes');
var router = express.Router();

function handle_data(app, data, id, files) {
	console.log(data);
	var connection = app.get('connection');
	
  var node = null;  
  for (var key in nodes.list)
  {
    if (nodes.list[key].id == id) node = nodes.list[key];
  }
  
	data.readings.forEach(function(readout) {		
		var sensor = node.sensors[readout.sensor_id];
		if (!sensor) {
			return;
		}
		switch (sensor.type) {
			case 1:
			connection.query("INSERT INTO temperaturereading(sensorid, reading, unixmilliseconds) VALUES(?, ?, ?)", [readout.sensor_id, readout.temperature, readout.time], function(err) { });
			break;
			
			case 2:
			connection.query("INSERT INTO sensor_files(sensorid, filename, time) VALUES(?, ?, ?)", [readout.sensor_id, readout.filename, readout.time], function(err) { console.log(err); });
			break;
		}
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
