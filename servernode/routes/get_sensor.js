var express = require('express');
var router = express.Router();
var nodes = require('../nodes');

router.get("/:sensor_id/:sensor_type", function(req, res) {
	nodes.read_sensor(parseInt(req.params.sensor_id), parseInt(req.params.sensor_type), function(value) {
		if (value != null) {
			res.json({ value: value });
		} else {
			res.status(404);
			res.end();
		}
	});
});

module.exports = router;
