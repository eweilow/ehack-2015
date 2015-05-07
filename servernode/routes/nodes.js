var express = require('express');
var router = express.Router();
var nodes = require('../nodes');

router.get('/:node_id', function(req, res, next) {
	var node_id = req.params.id;
	
	var node = nodes.list[0];
	
	var connection = req.app.get('connection');
	/*for (var sensor_id in node.sensors) {
		var sensor = node.sensors[sensor_id];
	}*/
	var sensors = {};
	connection.query("SELECT id, reading, unixmilliseconds time FROM temperaturereading WHERE sensorid = 1 ORDER BY time DESC LIMIT 1", [1], function(err, data) {
		if (!data.length) {
			res.status(500);
			res.end();
			return;
		}
		sensors[1] = { value: data[0].reading };
		res.render("nodes", { nice_name: node.nice_name, sensors: sensors });
	});
});

module.exports = router;
