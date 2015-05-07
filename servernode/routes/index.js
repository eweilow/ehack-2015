var express = require('express');
var router = express.Router();

var templatedata = require("../templatedata.js");

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Our Little Project', data: templatedata.mockup });
});

module.exports = router;
