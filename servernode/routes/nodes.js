var express = require('express');
var router = express.Router();
var nodes = require('../nodes');
var async = require('async');

router.get('/:node_id', function(req, res, next) {
	var node_id = req.params.node_id;
	
	var node = nodes.list[0];
	
	var connection = req.app.get('connection');
	var sensor_queries = {};
	console.log(node.sensors);
	for (var key in node.sensors) {
		var sensor = node.sensors[key];
		var sensor_id = parseInt(key);
		switch (sensor.type) {
			case 1:
			sensor_queries[sensor_id] = function(sensor_id) {
				return function(callback) {
					connection.query("SELECT id, reading, unixmilliseconds time FROM temperaturereading WHERE sensorid = ? ORDER BY time DESC LIMIT 1", [sensor_id], function(err, data) {
						console.log(data);
						if (data.length)
							callback(null, { type: 'temperature', value: data[0].reading });
						else
							callback(null, { type: 'temperature', value: 0 });
					});
				};
			}(sensor_id);
			break;
			
			case 2:
			sensor_queries[sensor_id] = function(sensor_id) {
				return function(callback) {
					connection.query("SELECT filename FROM sensor_files WHERE sensorid = ? ORDER BY time DESC LIMIT 1", [sensor_id], function(err, data) {
						if (data.length)
							callback(null, { type: 'picture', value: data[0].filename });
						else
							callback(null, { type: 'picture',  value: "" });
					});
				};
			}(sensor_id);
			break;
		}
	}
	
	console.log(sensor_queries);
	
	async.parallel(sensor_queries, function(err, sensors) {
		console.log(sensors);
		res.render("nodes", { node_id: node_id, nice_name: node.nice_name, sensors: sensors, interval: 2, last_read: 123 });
	});
});

module.exports = router;
