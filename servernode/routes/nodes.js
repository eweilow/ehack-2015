var express = require('express');
var router = express.Router();

var templatedata = require("../templatedata.js");

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('nodes', { title: 'NODES!!!', data: templatedata.mockup });
});


module.exports = router;
