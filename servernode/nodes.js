var net = require('net');

function SensorNode(ip, port) {
	this.ip = ip;
	this.port = port;
	this.ping_callbacks = [];
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
		console.log(data);
		node.ping_callbacks.forEach(function(callback) {
			callback(true);
		});
		node.ping_callbacks.length = 0;
	});
}

SensorNode.prototype.ping = function(callback) {
	if (this.state != STATE_CONNECTED) {
		console.log("opening socket");
		var node = this;
		this.open_socket(function(status) {
			if (status) {
				node.ping(callback);
			} else {
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

module.exports = {
	SensorNode: SensorNode,
};
