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
	connection.query("SELECT datapoint.* FROM temperaturereading datapoint INNER JOIN (SELECT sensorid, id, MAX(unixmilliseconds) time FROM temperaturereading WHERE sensorid = ? GROUP BY sensorid) maxdata WHERE datapoint.sensorid = maxdata.sensorid AND datapoint.id = maxdata.id", [1], function(err, data) {
		if (!data.length) {
			res.status(500);
			res.end();
			return;
		}
		sensors[1] = { value: data[0].reading };
		res.render("nodes", { sensors: sensors });
	});
});

module.exports = router;
