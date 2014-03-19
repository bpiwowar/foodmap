# Cluster times

import argparse
import logging

from math import radians, sqrt, sin, cos, atan2, pi

# https://gist.github.com/amites/3718961
def center_geolocation(geolocations):
    """
    Provide a relatively accurate center lat, lon returned as a list pair, given
    a list of list pairs.
    ex: in: geolocations = ((lat1,lon1), (lat2,lon2),)
        out: (center_lat, center_lon)
    """
    x = 0
    y = 0
    z = 0

    for lat, lon in geolocations:
        x += cos(lat) * cos(lon)
        y += cos(lat) * sin(lon)
        z += sin(lat)

    x = float(x / len(geolocations))
    y = float(y / len(geolocations))
    z = float(z / len(geolocations))

    return (atan2(z, sqrt(x * x + y * y)), atan2(y, x))

# geocalc
def geocalc(lat1, lon1, lat2, lon2):
    lat1 = lat1
    lon1 = lon1
    lat2 = lat2
    lon2 = lon2

    dlon = lon1 - lon2

    EARTH_R = 6372.8

    y = sqrt(
        (cos(lat2) * sin(dlon)) ** 2
        + (cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon)) ** 2
        )
    x = sin(lat1) * sin(lat2) + cos(lat1) * cos(lat2) * cos(dlon)
    c = atan2(y, x)
    return EARTH_R * c


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("match_titles")

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument("located_ingredients", help="List of ingredients + tab sep. GPS coordinates lat,long")
args = parser.parse_args()

K = 3

def radius(area):
    """:param area: km2"""
    return sqrt(area/pi)

codes_1 = {
    "A": radius(12000),
    "P": radius(105),
}

codes_2 = {
    "PCLI": radius(670000),
    "ADM1": radius(12000),
    "ADM2": radius(5000),
    "ADM3": radius(2500),
    "ADM4": radius(1200),
    "ADM5": radius(600)
}

for line in open(args.located_ingredients):
    fields = line.strip().split("\t")
    ingredient = fields[0]
    l = []

    # Process and convert degrees to
    for coordinates in fields[1:]:
        lat, long, code1, code2 = coordinates.split(",")
        lat, long = radians(float(lat)), radians(float(long))
        l.append((lat, long))

    k = min(K, len(coordinates))
    centers = range(K)
