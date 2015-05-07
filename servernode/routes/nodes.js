var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
	var connection = req.app.get('connection');
	connection.query("SELECT * FROM nodeinfo, nodestatus WHERE nodeinfo.id = nodestatus.nodeid", function(err, data) {
		//res.send(err);
		res.send(data);
	});
});

module.exports = router;
