#!/usr/bin/env python
# -*- coding: utf-8 -*-

import SocketServer

HOST = "0.0.0.0"
PORT = 5002

commandHandlers = {}

def pingHandler(request):
    request.sendall(chr(0))

commandHandlers[0] = pingHandler

class CommandHandler(SocketServer.BaseRequestHandler):
    def handle(self):
        self.data = self.request.recv(1024)

        print "Received data:"
        print self.data.__repr__()

        commandHandlers[ord(self.data)](self.request)

if __name__ == '__main__':
    import sys

    try:
        port = int(sys.argv[1])
    except (IndexError, ValueError):
        port = PORT

    server = SocketServer.TCPServer((HOST, port), CommandHandler)
    server.serve_forever()
