var net = require('net');

var nodes = {
	SensorNode: SensorNode,
	list: [],
	app: null
};

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
		if (this.queued_config) {
			this.push_config(this.queued_config);
			this.queued_config = null;
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
	connection.query("UPDATE nodestatus SET laststatus = ?, lastupdate = ? WHERE nodeid = ?", [this.status ? 1 : 0, 0, this.id]);
}

SensorNode.prototype.ping = function(callback) { // TODO: ping timeouts
	if (this.state != STATE_CONNECTED) {
		var node = this;
		this.open_socket(function(status) {
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
		this.socket.write("\1");
	} else {
		this.queued_config = config;
		this.open_socket(function() { });
	}
}

module.exports = nodes;
