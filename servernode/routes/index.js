var express = require('express');
var router = express.Router();
var nodes = require('../nodes');

router.get('/', function (req, res, next) {
  
  nodes.niceTransform(function (dataRes) {
    res.render('index', { title: 'Nodes', data: dataRes });
  });
});

module.exports = router;
