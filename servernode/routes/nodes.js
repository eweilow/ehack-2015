var express = require('express');
var router = express.Router();
var templatedata = require('../templatedata');

router.get("/:id", function(req, res){
	var id = req.params.id;
	
	var node = templatedata.mockup[id];
	if(!node) { res.status(404); return res.end(); }
	
	res.render("nodes", {node: node});
});

module.exports = router;
