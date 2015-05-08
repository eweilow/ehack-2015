var net = require('net');

/*
5: {
    NiceName: "Coke-Rainbow",
    Readings: [ 35, 22.1, 22.15, 22.1, 22 ],
    LastReading: 3.1,
    Interval: 2.0
  },
*/

var nodes = {
	SensorNode: SensorNode,
	list: [],
  app: null
};

nodes.niceTransform = function (callback) {
    var res = {};
    
    var connection = nodes.app.get('connection');
    
    connection.query("SELECT * FROM nodeinfo", function(err, list) {       
      if (err) return console.log(err);
      
      var parser = function (index) {
        if (index + 1 > list.length) return callback(res);
        var node = list[index];
        
        //console.log(node);
        
        connection.query("SELECT reading FROM temperaturereading WHERE sensorid = (SELECT id FROM sensorinfo WHERE nodeid = ? AND sensortype = 1 LIMIT 1) ORDER BY unixmilliseconds DESC LIMIT 1", [node.id], function (err, data) {
          if (err) throw err;
          
          connection.query("SELECT filename FROM sensor_files WHERE sensorid = (SELECT id FROM sensorinfo WHERE nodeid = ? AND sensortype = 2 LIMIT 1) ORDER BY time DESC LIMIT 1", [node.id], function (err, data2) {
            if (err) throw err;
            
            
            
            res[node.id] = { NiceName: node.nicename, FileName: node.id + "-" + (data2[0] || {}).filename, Readings: [(data[0] || {}).reading], LastReading: 5.0/*(new Date).getTime() - data[0].unixmilliseconds*/, Interval: 1.0 };
  
  
            parser(index + 1);
          });
        });
      };
      parser(0);
    });
  }

function SensorNode(id, nice_name, ip, port, last_status, last_ping) {
	this.id = id;
	this.nice_name = nice_name;
	this.ip = ip;
	this.port = port;
	this.last_status = last_status;
	this.last_ping = last_ping;
	this.state = STATE_DISCONNECTED;
	
	this.ping_callbacks = [];
	this.sensors = {};
}

var STATE_DISCONNECTED = 0;
var STATE_CONNECTING = 1;
var STATE_CONNECTED = 2;

SensorNode.prototype.open_socket = function(callback) {
	if (this.state != STATE_DISCONNECTED) {
		return;
	}
	
	this.socket = net.connect({
		host: this.ip,
		port: this.port
	});
	this.state = STATE_CONNECTING;
	var node = this;
	
	this.socket.on('connect', function() {
		node.state = STATE_CONNECTED;
		if (node.queued_config) {
			node.push_config(node.queued_config);
			node.queued_config = null;
		}
		callback(true);
	});
	
	this.socket.on('close', function() {
		node.state = STATE_DISCONNECTED;
	});
	
	this.socket.on('error', function() {
		if (node.state == STATE_CONNECTING) {
			callback(false);
		}
	});
	
	this.socket.on('data', function(data) {
		if (node.ping_callbacks.length)
			node.set_last_status(true);
		node.ping_callbacks.forEach(function(callback) {
			callback(true);
		});
		node.ping_callbacks.length = 0;
	});
}

SensorNode.prototype.set_last_status = function(status) { // TODO: update time
	this.last_status = status;
	var connection = nodes.app.get('connection');
  connection.query("UPDATE nodestatus SET laststatus = ?, lastupdate = ? WHERE nodeid = ?", [status ? 1 : 0, 0, this.id]);
}

SensorNode.prototype.ping = function(callback) { // TODO: ping timeouts
	if (this.state != STATE_CONNECTED) {
		var node = this;
		this.open_socket(function(status) { // TODO: fix this shit
			if (status) {
				node.ping(callback);
			} else {
				node.set_last_status(false);
				callback(false);
			}
		})
		return;
	}
	
	this.ping_callbacks.push(callback);
	this.socket.write("\0");
};

SensorNode.prototype.push_config = function(config) {
	if (this.state == STATE_CONNECTED) {
		var encoded = new Buffer(JSON.stringify(config));
		var message = new Buffer(5+encoded.length);
		message.writeUIntLE(1, 0, 1);
		message.writeUIntLE(encoded.length, 1, 4);
		encoded.copy(message, 5);
		this.socket.write(message);
	} else {
		this.queued_config = config;
		this.open_socket(function() { });
	}
}

nodes.read_sensor = function(sensor_id, type, callback) {
	var connection = nodes.app.get('connection');
	switch (type) {
		case 1:
		connection.query("SELECT id, reading, unixmilliseconds time FROM temperaturereading WHERE sensorid = ? ORDER BY time DESC LIMIT 30", [sensor_id], function(err, data) {
			callback(data.map(function(row) { return { value: row.reading, time: row.time }; }));
		});
		break;
		
		case 2:
		connection.query("SELECT filename FROM sensor_files WHERE sensorid = ? ORDER BY time DESC LIMIT 1", [sensor_id], function(err, data) {
			if (data.length)
				callback(data[0].filename);
			else
				callback(null);
		});
		break;
	}
}

module.exports = nodes;
