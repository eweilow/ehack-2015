var express = require('express');
var router = express.Router();
var nodes = require('../nodes');

router.get('/', function(req, res, next) {
	res.render('index', { title: 'Nodes', data: nodes.list });
});

module.exports = router;
