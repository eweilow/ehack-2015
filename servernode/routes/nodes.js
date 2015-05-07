var express = require('express');
var router = express.Router();
var nodes = require('../nodes');
var async = require('async');

router.get('/:node_id', function(req, res, next) {
	var node_id = req.params.id;
	
	var node = nodes.list[0];
	
	var connection = req.app.get('connection');
	var sensor_queries = {};
	for (var sensor_id in node.sensors) {
		var sensor = node.sensors[sensor_id];
		console.log(sensor.type);
		switch (sensor.type) {
			case 1:
			console.log("aa");
			sensor_queries[sensor_id] = function(callback) {
				connection.query("SELECT id, reading, unixmilliseconds time FROM temperaturereading WHERE sensorid = ? ORDER BY time DESC LIMIT 1", [sensor_id], function(err, data) {
					//callback({ value: data[0].reading });
					callback(null, { value: 420 });
				});
			};
			break;
		}
	}
	
	console.log(sensor_queries);
	
	async.parallel(sensor_queries, function(err, sensors) {
		console.log(sensors);
		res.render("nodes", { nice_name: node.nice_name, sensors: sensors, interval: 2, last_read: 123 });
	});
});

module.exports = router;
