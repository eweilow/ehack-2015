#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys
import Queue
import time
import cputemp
import tcpcommands
import thermometer
from collections import OrderedDict
from io import BytesIO
from threading import Thread
from picamera.camera import PiCamera
from requests import ConnectionError, Timeout
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
    def __init__(self, configPath="config.json"):
        self.configPath = configPath

        with open(self.configPath, 'r') as f:
            self.config = json.load(f)

        # Connect to the sensor node via TCP and send it \x00 or \x01 + a
        # JSON config to bind it to your IP. It'll start pushing according to
        # config.
        self.commander = tcpcommands.Commander(self)

        # Naturally, statically always adding the same two-three sensors
        # isn't very flexible, but in our case it works pretty well.
        self.sensors = []
        self.addSensor(CameraSensor)
        if thermometer.exists():
            self.addSensor(ThermometerSensor)
        self.addSensor(CpuTempSensor)

        self.pusher = self.addSensor(Pusher) # Not a sensor, but...

        self.fileQueue = Queue.Queue()
        self.readingQueue = Queue.Queue()

    server = None
    ip = None
    port = None
    exitSignalReceived = False

    def addSensor(self, class_, sensorId=None):
        if sensorId is None:
            sensor = class_(self)
        else:
            sensor = class_(self, sensorId)
        self.sensors.append(sensor)
        return sensor

    def setServer(self, ip, port):
        self.ip = ip
        self.port = port
        self.server = ServerNode(ip, port, self.config["node_id"])
        threadsafePrint("Bound node to {}:{}.".format(
            str(self.ip), str(self.port)))
        self.push()

    def push(self):
        self.pusher.do()

    def run(self):
        Thread(target=self.commander.run).start()
        for sensor in self.sensors:
            Thread(target=sensor.run).start()

        try:
            while True:
                time.sleep(100)
        except (KeyboardInterrupt, SystemExit) as e:
            threadsafePrint("Stopping commander.")
            self.commander.close()
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
        totalSleep = self.node.config["sensors"][self.sensorId]["delay"] - \
            (time2 - timeStarted)
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
            if self.node.config["sensors"][self.sensorId]["delay"] <= \
                totalSlept:
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
    def __init__(self, node, sensorId="thermometer"):
        Sensor.__init__(self, node, sensorId)

    def do(self):
        # Erik wants the temperature and time in milliwhatevers.
        temperature = int(thermometer.check() * 1000)
        t = int(time.time() * 1000)

        threadsafePrint("Queuing temperature...")
        reading = thermometerReading(time.time(), thermometer.check())
        self.node.readingQueue.put(reading)

class CameraSensor(Sensor):
    def __init__(self, node, sensorId="camera"):
        Sensor.__init__(self, node, sensorId)

    def do(self, camera):
        self.queuePicture(camera)

    def run(self):
        with PiCamera(
            resolution=self.node.config["sensors"][self.sensorId]["resolution"]
        ) as camera:
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

class CpuTempSensor(Sensor):
    def __init__(self, node, sensorId="cputemp"):
        Sensor.__init__(self, node, sensorId)

    def do(self):
        reading = cputempReading(time.time(), cputemp.check())
        self.node.readingQueue.put(reading)

class Pusher(Sensor):
    # I mean, it's not a sensor, but it works the same way.
    def __init__(self, node):
        Sensor.__init__(self, node, "push")

    def do(self):
        if self.node.server is None:
            threadsafePrint("Not pushing - not connected to a server.")
            return
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
            r = self.node.server.pushFiles(dataList + [readingsJson],
                filenames + ["readings.json"], isData=True)
        except (ConnectionError, Timeout) as e:
            threadsafePrint("Couldn't send files to server. Re-queuing data.")
            for reading in j["readings"]:
                while self.node.readingQueue.qsize() >= 5000:
                    self.node.readingQueue.get()
                self.node.readingQueue.put(reading)
            for filename, data in zip(filenames, dataList):
                while self.node.fileQueue.qsize() >= 75:
                    self.node.readingQueue.get()
                self.node.fileQueue.put((filename, data))

def cameraReading(t, extension=".jpg"):
    t = int(t * 1000)
    return {
        "type": 2,
        "time": t,
        "filename": str(t) + extension
    }

def thermometerReading(t, temperature):
    t = int(t * 1000)
    temperature = int(thermometer.check() * 1000)
    return {
        "sensoroffset": 0, # HEJDÅ ERIK
        "type": 1,
        "time": t,
        "temperature": temperature
    }

def cputempReading(t, temperature):
    t = int(t * 1000)
    temperature = int(thermometer.check() * 1000)
    return {
        "sensoroffset": 1, # NEJDÅ ERIK
        "type": 1,
        "time": t,
        "temperature": temperature
    }

if __name__ == '__main__':
    SensorNode().run()
