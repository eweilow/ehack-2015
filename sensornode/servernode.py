#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import requests

class ServerNode(object):
    def __init__(self, ip, port):
        self.ip = ip
        self.pushFileUrl = "http://" + self.ip + ":" + str(port) + "/push_data"

    def pushFile(self, path):
        filename = os.path.split(path)[1]
        with open(path, 'rb') as f:
            data = f.read()
        files = [(filename, data)]
        requests.put(self.pushFileUrl, files=files)

if __name__ == '__main__':
    pass
