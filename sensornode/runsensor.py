#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
import tcpcommands
import thermometer
from picamera.camera import PiCamera

def doCamera():
    with PiCamera() as camera:
        time1 = time.time()
        while True:
            print "I am taking a picture. Not really, but you know."
            time2 = time.time()
            time.sleep(10 - (time2 - time1))
            time1 = time.time()

if __name__ == '__main__':
    doCamera()
