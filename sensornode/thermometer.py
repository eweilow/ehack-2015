#!/usr/bin/env python
# -*- coding: utf-8 -*-

import glob
import os

thermometerPath = os.path.join(glob.glob("/sys/bus/w1/devices/28-*")[0],
    "w1_slave")

class ReadError(Exception):
    pass

def check():
    with open(thermometerPath, 'r') as f:
        thermometerOutput = f.read()
    lines = thermometerOutput.split('\n')
    status = lines[0].split()[-1] == "YES"
    if not status:
        raise ReadError("The thermometer's read operation failed.")
    celsius = int(lines[1].split('=')[-1]) / 1000.0
    return celsius

if __name__ == '__main__':
    print check()
