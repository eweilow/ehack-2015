#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import time
import tcpcommands
import thermometer
from collections import OrderedDict
from cStringIO import StringIO
from picamera.camera import PiCamera
from servernode import ServerNode

def doCamera():
    with PiCamera() as camera:
        time1 = time.time()
        while True:
            print "I am taking a picture. Not really, but you know."
            time2 = time.time()
            time.sleep(10 - (time2 - time1))
            time1 = time.time()

def pushTemperature():
    with open("serverip.txt", 'r') as f:
        ip, port = f.read().strip().split(':')
    port = int(port)
    server = ServerNode(ip, port, 707)
    temperature = int(thermometer.check() * 1000)
    t = int(time.time() * 1000)
    tempJson = {
        "readings": [
            {
                "type": "thermometer",
                "time": t,
                "temperature": temperature
            }
        ]
    }

    with StringIO(json.dumps(tempJson, f)) as f:
        server.pushFile(f, "readings.json")

def doThermometer():
    time1 = time.time()
    while True:
        print "Pushing temperature..."
        pushTemperature()
        time2 = time.time()
        time.sleep(10 - (time2 - time1))
        time1 = time.time()
    # Rename functions, don't write a dummy file just to send it
    # Don't initialize server in pushTemperature

if __name__ == '__main__':
    doThermometer()
