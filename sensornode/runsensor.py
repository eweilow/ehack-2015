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
            ip, port = f.read().strip().split(':')
        port = int(port)
        nodeId = 10

        self.server = ServerNode(ip, port, nodeId)

        self.config = {
            "delay": {
                1: 1,
                2: 1,
                "push": 1
            }
        }

        self.exitSignalReceived = False

    def run(self):
        cameraThread = Thread(target=self.doCamera)
        thermometerThread = Thread(target=self.doThermometer)

        cameraThread.start()
        thermometerThread.start()

        try:
            while True:
                time.sleep(100)
        except (KeyboardInterrupt, SystemExit) as e:
            self.exitSignalReceived = True
            raise e

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

    def doCamera(self, sensorId=2):
        with PiCamera() as camera:
            timeStarted = time.time()
            while True:
                self.pushPicture(camera)
                keepGoing = self.smartSleep(sensorId, timeStarted)
                if not keepGoing:
                    return
                timeStarted = time.time()

    def pushTemperature(self):
        # Erik wants the temperature and time in milliwhatevers.
        temperature = int(thermometer.check() * 1000)
        t = int(time.time() * 1000)

        readings = wrapReading(thermometerReading(time.time(),
            thermometer.check()))

        threadsafePrint("Pushing temperature...")
        with BytesIO(json.dumps(readings)) as f:
            self.server.pushFile(f, "readings.json")

    def doThermometer(self, sensorId=1):
        timeStarted = time.time()
        while True:
            self.pushTemperature()
            keepGoing = self.smartSleep(sensorId, timeStarted)
            if not keepGoing:
                return
            timeStarted = time.time()

    def smartSleep(self, sensorId, timeStarted):
        """Sleep for the delay specified for the sensor `sensorId`,
        continuously checking for config changes and exit signals. If an exit
        signal is received, return False, otherwise True.
        """
        time2 = time.time()
        totalSleep = self.config["delay"][sensorId] - (time2 - timeStarted)
        totalSlept = 0
        for i in ([5] * int(totalSleep / 5)) + [totalSleep % 5]:
            # Check for config updates and kill signals
            # even when just waiting around.
            time3 = time.time()
            if self.exitSignalReceived:
                return False
            if self.config["delay"][sensorId] <= totalSlept:
                break
            time4 = time.time()
            totalSlept += i
            time.sleep(i - (time4 - time3))
        return True

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
