var express = require('express');
var router = express.Router();

var nodes = require("../nodes.js");

router.get('/', function(req, res, next) {
	res.render('forms', { title: 'Forms' });
});

router.post("/", function (req, res) {
  req.body.name;

  var connection = req.app.get('connection');  
  connection.query("INSERT INTO nodeinfo(nicename, datecreated, ip, port) VALUES(?, NOW(), ?, ?)", [req.body.name, req.body.ip, req.body.port], function (err, result) {     
    if (err) return console.log(err);
    nodes.list.push(new nodes.SensorNode(result.insertId, req.body.name, req.body.port, req.body.port, 0, 0));
    connection.query("INSERT INTO nodestatus(nodeid, laststatus, lastupdate) VALUES(?, 0, 0)", [result.insertId], function (err, result) {     
      if (err) return console.log(err);
      //nodes.list.push(new nodes.SensorNode(result.insertId, req.body.name, req.body.port, req.body.port, 0, 0));
    });
  });
  res.redirect("/");
});

router.get("/remove/:id", function (req, res) {
  var connection = req.app.get("connection");
  connection.query("DELETE FROM nodeinfo WHERE id = ?", [req.params.id], function (err, result) {    
    if (err) { console.log(err); res.status(404); return res.end(); }
    connection.query("DELETE FROM nodestatus WHERE nodeid = ?", [req.params.id], function (err, result) {
      if (err) { console.log(err); res.status(404); return res.end(); }
      
      res.redirect("/");
    });
  });
});
module.exports = router;