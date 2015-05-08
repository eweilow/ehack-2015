#!/usr/bin/env python
# -*- coding: utf-8 -*-

class ReadError(Exception):
    pass

cputempPath = "/sys/class/thermal/thermal_zone0/temp"

def check():
    with open(cputempPath, 'r') as f:
        cputempOutput = f.read()
    celsius = int(cputempOutput) / 1000.0
    return celsius
