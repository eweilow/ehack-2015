var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
	var connection = req.app.get('connection');
	connection.query("SELECT * FROM node_info, last_ping WHERE node_info.id = last_ping.id", function(err, data) {
		res.send(err);
		//res.send(data);
	});
});

module.exports = router;
