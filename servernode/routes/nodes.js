var express = require('express');
var router = express.Router();

router.get('/:node_id', function(req, res, next) {
	var node_id = req.params.id;
	
	var connection = req.app.get('connection');
	connection.query("SELECT datapoint.* FROM temperaturereading datapoint INNER JOIN (SELECT nodeid, id, MAX(unixmilliseconds) time FROM temperaturereading WHERE id = ? GROUP BY nodeid) maxdata WHERE datapoint.nodeid = maxdata.nodeid AND datapoint.id = maxdata.id", [req.params.node_id], function(err, data) {
		if (!data.length) {
			res.status(500);
			res.end();
			return;
		}
		var sensors = {}
		data.forEach(function(sensor_data) {
			sensors[sensor_data.nodeid] = { value: sensor_data.reading };
		});
		res.render("nodes", { sensors: sensors });
	});
});

module.exports = router;
