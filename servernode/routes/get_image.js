var express = require('express');
var fs = require('fs');
var mimeTypes = require('mime-types');
var router = express.Router();

router.get('/:node_id/:resource_name', function(req, res, next) {
	try {
		var file = fs.createReadStream("received_files/" + req.params.node_id + "-" + req.params.resource_name);
	} catch (e) {
		res.end();
		return;
	}
	res.setHeader("Content-Type", mimeTypes.lookup(req.params.resource_name));
	file.on('data', function(data) {
		res.write(data);
	});
	file.on('end', function() {
		res.end();
	});
	file.resume();
});

module.exports = router;
