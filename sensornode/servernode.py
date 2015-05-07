#!/usr/bin/env python
# -*- coding: utf-8 -*-

# For interfacing with the server node.
# This isn't the actual server node, of course - that's running
# on node.js.

import os
import requests

class ServerNode(object):
    def __init__(self, ip, port, sensorId):
        self.ip = ip
        self.pushFileUrl = "http://" + self.ip + ":" + str(port) \
            + "/push_data/" + str(sensorId)

    def pushFile(self, pathOrFile, filename=None):
        self.pushFiles([pathOrFile], [filename])

    def pushFiles(self, pathOrFileList, filenames=None):
        filenames = filenames if filenames is not None \
            else [None] * len(pathOrFileList)
        files = []

        for i, pathOrFile in enumerate(pathOrFileList):
            if hasattr(pathOrFile, "read"):
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

        requests.put(self.pushFileUrl, files=files)

if __name__ == '__main__':
    with open("serverip.txt", 'r') as f:
        ip, port = f.read().strip().split(':')
    port = int(port)
    server = ServerNode(ip, port, 707)
    server.pushFiles(["servernodetest.png", "readings.json"])
