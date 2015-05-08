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
		sensor_queries[sensor_id] = function(callback) {
			nodes.read_sensor(sensor_id, sensor.type, function(data) {
				if (data) {
					console.log(sensor.type);
					callback(null, { type: sensor.type,  value: data });
				} else {
					callback(null, { type: 0,  value: "" });
				}
			})
		};
	}
	
	console.log(sensor_queries);
	
	async.parallel(sensor_queries, function(err, sensors) {
		console.log(sensors);
		res.render("node", { node_id: node_id, nice_name: node.nice_name, sensors: sensors, interval: 2, last_read: 123 });
	});
});

module.exports = router;
