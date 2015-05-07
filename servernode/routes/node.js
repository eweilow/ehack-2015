var express = require('express');
var router = express.Router();

router.get('/:node_id', function(req, res, next) {
	var connection = req.app.get('connection');
	connection.query("SELECT * FROM nodeinfo, nodestatus WHERE nodeinfo.id = nodestatus.id, id = ?", [req.params.node_id], function(err, data) {
		res.send(err);
		//res.send(data);
	});
});

module.exports = router;
