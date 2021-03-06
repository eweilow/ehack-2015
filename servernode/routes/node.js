var express = require('express');
var router = express.Router();
var nodes = require('../nodes');
var async = require('async');

router.get('/:node_id', function(req, res, next) {
	var node_id = req.params.node_id;
	
	console.log(nodes.list);
	var node = null;  
	for (var key in nodes.list)
	{
		if (nodes.list[key].id == node_id) node = nodes.list[key];
	}
	
	var connection = req.app.get('connection');
	var sensor_queries = {};
	for (var key in node.sensors) {
		var sensor = node.sensors[key];
		
		sensor_queries[key] = function(sensor, key) {
			return function(callback) {
				nodes.read_sensor(node_id, sensor.type, function(data) {
					if (data) {
						callback(null, { type: sensor.type,  value: data });
					} else {
						callback(null, { type: 0,  value: "" });
					}
				});
			};
		}(sensor, key);
	}
	
	async.parallel(sensor_queries, function(err, sensors) {
		res.render("node", { node_id: node_id, ip: node.ip, port: node.port, nice_name: node.nice_name, sensors: sensors, interval: 2, last_read: 123 });
	});
});

router.post("/:node_id/", function(req, res) {
	var node_id = req.params.node_id;
	
	console.log(nodes.list);
	var node = null;  
	for (var key in nodes.list)
	{
		if (nodes.list[key].id == node_id) node = nodes.list[key];
	}
	
	var connection = req.app.get('connection');
	var sensor_queries = {};
	for (var key in node.sensors) {
		var sensor = node.sensors[key];
		
		sensor_queries[key] = function(sensor, key) {
			return function(callback) {
				nodes.read_sensor(node_id, sensor.type, function(data) {
					if (data) {
						callback(null, { type: sensor.type, value: data });
					} else {
						callback(null, { type: 0,  value: "" });
					}
				});
			};
		}(sensor, key);
	}
	
	async.parallel(sensor_queries, function(err, sensors) {
		res.json(sensors);
	});
});

module.exports = router;
