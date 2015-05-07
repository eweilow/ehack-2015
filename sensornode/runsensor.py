#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys
import time
import tcpcommands
import thermometer
from collections import OrderedDict
from io import BytesIO
from threading import Thread
from picamera.camera import PiCamera
from servernode import ServerNode

def threadsafePrint(s):
    sys.stdout.write(s + "\n")

class SensorNode(object):
    def __init__(self):
        with open("serverip.txt", 'r') as f:
            self.ip, self.port = f.read().strip().split(':')
        self.port = int(self.port)
        self.id = 1

        self.server = ServerNode(self.ip, self.port, self.id)

    def run(self):
        cameraThread = Thread(target=self.doCamera)
        thermometerThread = Thread(target=self.doThermometer)

        cameraThread.start()
        thermometerThread.start()

    def pushPicture(self, camera):
        with BytesIO() as f:
            threadsafePrint("Takin' picture.")
            readings = wrapReading(cameraReading(time.time()))
            camera.capture(f, 'jpeg')
            threadsafePrint("Pushin' picture.")

            f.seek(0)
            with BytesIO(json.dumps(readings)) as f2:
                self.server.pushFiles([f, f2], [
                    readings["readings"][0]["filename"],
                    "readings.json"
                ])

    def doCamera(self):
        try:
            with PiCamera() as camera:
                time1 = time.time()
                while True:
                    self.pushPicture(camera)
                    time2 = time.time()
                    time.sleep(10 - (time2 - time1))
                    time1 = time.time()
        except Exception as e:
            camera.close()
            raise e

    def pushTemperature(self):
        # Erik wants the temperature and time in milliwhatevers.
        temperature = int(thermometer.check() * 1000)
        t = int(time.time() * 1000)

        readings = wrapReading(thermometerReading(time.time(),
            thermometer.check()))

        threadsafePrint("Pushing temperature...")
        with BytesIO(json.dumps(readings)) as f:
            self.server.pushFile(f, "readings.json")

    def doThermometer(self):
        time1 = time.time()
        while True:
            self.pushTemperature()
            time2 = time.time()
            time.sleep(10 - (time2 - time1))
            time1 = time.time()

def cameraReading(t, extension=".jpg"):
    t = int(time.time() * 1000)
    return {
        "sensor_id": 2,
        "type": "camera",
        "time": t,
        "filename": str(t) + extension
    }

def thermometerReading(t, temperature):
    t = int(time.time() * 1000)
    temperature = int(thermometer.check() * 1000)
    return {
        "sensor_id": 1,
        "type": "thermometer",
        "time": t,
        "temperature": temperature
    }

def wrapReading(reading):
    return {
        "readings": [
            reading
        ]
    }

if __name__ == '__main__':
    SensorNode().run()
