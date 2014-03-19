__author__ = 'bpiwowar'

import argparse
import logging
import ijson
import os
from subprocess import Popen
import subprocess
import sys


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("match_titles")

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument("recipes", help="JSON recipes")

args = parser.parse_args()


f = open(args.recipes, "r")
for item in ijson.items(f, "item.name"):
    print(item.replace("-", " "))
