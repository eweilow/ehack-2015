var express = require('express');
var router = express.Router();

var templatedata = require("../templatedata.js");

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Our Little Project', data: templatedata.mockup });
});

router.get("/node/:id", function(req, res){
	var id = req.params.id;
	
	var node = templatedata[id];
	if(!node) return res.status(404);
	
	res.render("node", {node: node});
});

module.exports = router;
