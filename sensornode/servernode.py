#!/usr/bin/env python
# -*- coding: utf-8 -*-

# For interfacing with the server node.
# This isn't the actual server node, of course - that's running
# on node.js.

import os
import requests

class ServerNode(object):
    def __init__(self, ip, port):
        self.ip = ip
        self.pushFileUrl = "http://" + self.ip + ":" + str(port) + "/push_data"

    def pushFile(self, pathOrFile, body="" filename=None):
        self.pushFiles([pathOrFile], body, [filename])

    def pushFiles(self, pathOrFileList, body="", filenames=None):
        filenames = filenames if filenames is not None \
            else [None] * len(pathOrFileList)
        files = []

        for i, pathOrFile in enumerate(pathOrFileList):
            if isinstance(pathOrFile, file):
                filename = filenames[i]
                data = pathOrFile.read()
            else:
                filename = filenames[i] if filenames[i] is not None \
                    else os.path.split(pathOrFile)[1]
                with open(pathOrFile, 'rb') as f:
                    data = f.read()
            files.append((filename, data))

        if not filename:
            raise ValueError("Pushing a file requires a filename.")

        requests.put(self.pushFileUrl, body, files=files)

if __name__ == '__main__':
    with open("serverip.txt", 'r') as f:
        ip, port = f.read().strip().split(':')
    port = int(port)
    server = ServerNode(ip, port)
    server.pushFile("servernodetest.png")
