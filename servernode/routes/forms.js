var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
	res.render('forms', { title: 'Forms' });
});

router.post("/", function (req, res) {
  req.body.name;

  var connection = req.app.get('connection');  
  connection.query("INSERT INTO nodeinfo(nicename, datecreated, ip, port) VALUES(?, NOW(), ?, ?)", [req.body.name, req.body.ip, req.body.port], function(err) { });
  res.redirect("/");
});
module.exports = router;