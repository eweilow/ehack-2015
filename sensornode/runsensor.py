#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys
import Queue
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

class Drain(object):
    def __init__(self, queue):
        self.queue = queue

    def __iter__(self):
        while True:
            try:
                yield self.queue.get_nowait()
            except Queue.Empty:
                break

class SensorNode(object):
    def __init__(self):
        with open("serverip.txt", 'r') as f:
            ip, port = f.read().strip().split(':')
        port = int(port)
        nodeId = 10

        self.server = ServerNode(ip, port, nodeId)

        self.sensors = []
        self.addSensor(CameraSensor)
        self.addSensor(ThermometerSensor)

        self.addSensor(Pusher) # Not a sensor, but...

        self.fileQueue = Queue.Queue()
        self.readingQueue = Queue.Queue()

        self.config = {
            "delay": {
                1: 1,
                2: 10,
                "push": 1
            }
        }

        self.exitSignalReceived = False

    def addSensor(self, class_, sensorId=None):
        if sensorId is None:
            self.sensors.append(class_(self))
        else:
            self.sensors.append(class_(self, sensorId))

    def run(self):
        for sensor in self.sensors:
            Thread(target=sensor.run).start()

        try:
            while True:
                time.sleep(100)
        except (KeyboardInterrupt, SystemExit) as e:
            self.exitSignalReceived = True
            raise e

class Sensor(object):
    """Subclass this class and override the `do` method to create custom
    sensors."""

    def __init__(self, node, sensorId):
        self.node = node
        self.sensorId = sensorId

    def run(self, *args, **kwargs):
        timeStarted = time.time()
        while True:
            self.do(*args, **kwargs)
            keepGoing = self.smartSleep(timeStarted)
            if not keepGoing:
                return
            timeStarted = time.time()

    def smartSleep(self, timeStarted):
        """Sleep for the delay specified for the sensor `sensorId`,
        continuously checking for config changes and exit signals. If an exit
        signal is received, return False, otherwise True.
        """
        time2 = time.time()
        totalSleep = self.node.config["delay"][self.sensorId] - (time2 - timeStarted)
        totalSlept = 0
        # Modulo gives you a remainder even with negative numbers, so the
        # following line might look a bit odd.
        sleepIntervals = ([5] * int(totalSleep / 5)) + ([totalSleep % 5] if
            totalSleep > 0 else [])
        for i in sleepIntervals:
            # Check for config updates and kill signals
            # even when just waiting around.
            time3 = time.time()
            if self.node.exitSignalReceived:
                threadsafePrint("Stopping recurring service '{}'.".format(
                    self.sensorId))
                return False
            if self.node.config["delay"][self.sensorId] <= totalSlept:
                break
            time4 = time.time()
            totalSlept += i
            time.sleep(i - (time4 - time3))
        if self.node.exitSignalReceived:
            # In case the thing doesn't ever sleep.
            threadsafePrint("Stopping recurring service '{}'.".format(
                self.sensorId))
            return False
        return True

class ThermometerSensor(Sensor):
    def __init__(self, node, sensorId=1):
        Sensor.__init__(self, node, sensorId)

    def do(self):
        # Erik wants the temperature and time in milliwhatevers.
        temperature = int(thermometer.check() * 1000)
        t = int(time.time() * 1000)

        threadsafePrint("Queuing temperature...")
        reading = thermometerReading(time.time(), thermometer.check())
        self.node.readingQueue.put(reading)

class CameraSensor(Sensor):
    def __init__(self, node, sensorId=2):
        Sensor.__init__(self, node, sensorId)

    def do(self, camera):
        self.queuePicture(camera)

    def run(self):
        with PiCamera() as camera:
            Sensor.run(self, camera)

    def queuePicture(self, camera):
        with BytesIO() as f:
            threadsafePrint("Takin' picture.")
            reading = cameraReading(time.time())
            camera.capture(f, 'jpeg')

            threadsafePrint("Queuin' picture.")
            f.seek(0)
            self.node.readingQueue.put(reading)
            self.node.fileQueue.put((reading["filename"], f.read()))

class Pusher(Sensor):
    # I mean, it's not a sensor, but it works the same way.
    def __init__(self, node):
        Sensor.__init__(self, node, "push")

    def do(self):
        if self.node.readingQueue.empty():
            threadsafePrint("Not pushing - empty queue.")
            return

        j = {
            "readings": []
        }
        for reading in Drain(self.node.readingQueue):
            j["readings"].append(reading)
        readingsJson = json.dumps(j)

        filenames, dataList = [], []
        for filename, data in Drain(self.node.fileQueue):
            filenames.append(filename)
            dataList.append(data)

        threadsafePrint("Pushing data!")
        try:
            self.node.server.pushFiles(dataList + [readingsJson],
                filenames + ["readings.json"], isData=True)
        except requests.ConnectionError:
            threadsafePrint("Couldn't connect to server. Away with ye, data.")

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
