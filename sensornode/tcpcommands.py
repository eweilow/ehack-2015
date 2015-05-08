#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import struct
import SocketServer
import time
from collections import Mapping
from threading import Thread

HOST = "0.0.0.0"
PORT = 5048
PUSHPORT = 3000

commandHandlers = {}

def pingHandler(request, node):
    request.sendall(chr(0))

commandHandlers[0] = pingHandler

def configHandler(request, node):
    dataLength = struct.unpack('<I', request.recv(4))[0]
    configJson = request.recv(dataLength)
    config = json.loads(configJson)

    updateRecursiveDictionary(node.config, config)

    with open(node.configPath, 'w') as f:
        json.dump(node.config, f, indent=4)

commandHandlers[1] = configHandler

def updateRecursiveDictionary(d1, d2):
    for key, value in d2.iteritems():
        if isinstance(value, Mapping):
            subDict = updateRecursiveDictionary(d1.get(key, {}), value)
            d1[key] = subDict
        else:
            d1[key] = value
    return d1

class Commander(object):
    def __init__(self, node, host=HOST, port=PORT):
        self.node = node
        self.server = SocketServer.TCPServer((host, port), self.handler())

    commandHandlers = commandHandlers
    exitSignalReceived = False

    def handler(self):
        commander = self
        class CommandHandler(SocketServer.BaseRequestHandler):
            def handle(self):
                data = self.request.recv(1)
                print "Received command {}. Executing.".format(str(ord(data)))

                commander.node.setServer(self.request.getpeername()[0],
                    PUSHPORT)

                commandHandlers[ord(data)](self.request, commander.node)
        return CommandHandler

    def run(self):
        Thread(target=self.server.serve_forever).start()

    def close(self):
        self.server.shutdown()
