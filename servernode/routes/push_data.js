var express = require('express');
var fs = require('fs');
var path = require('path');
var nodes = require('../nodes');
var router = express.Router();

function handle_data(app, data, id, files) {
	console.log(data);
	var connection = app.get('connection');
	var node = nodes.list[0]; // TODO: grab the right node
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
    
    var reading_data = {};
    req.busboy.on('file', function (fieldname, stream, filename) {
      stream.on('data', function (data) {
        if (!reading_data.hasOwnProperty(filename)) reading_data[filename] = "";
        reading_data[filename] += data;
      });
			stream.resume();
		});
    req.busboy.on('finish', function () {
      for (var filename in reading_data) {
        if (filename != "readings.json") {
          var connection = req.app.get('connection');
          connection.query("INSERT INTO datatable(filename,data) VALUES(?,?)", [filename, reading_data[filename]], function (err) { console.log(err); res.end(); });
        }
        else {
          handle_data(req.app, JSON.parse(reading_data[filename]), req.params.node_id, req.params.node_id, [])

        }
      }
	            res.end();
    });
		req.pipe(req.busboy);
	} else {
		handle_data(req.app, req.body, req.params.node_id, [])
		res.end();
	}
});

module.exports = router;
