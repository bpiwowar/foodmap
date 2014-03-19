# Cluster times

import argparse
import logging
import random

from math import radians, sqrt, sin, cos, atan2, pi

# https://gist.github.com/amites/3718961
import sys


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

K = 30
MIN_SUPPORT = 0.02
MAX_STEPS = 50
CHANGE_THRESHOLD=.05

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

count = 0
for line in open(args.located_ingredients):
    fields = line.strip().split("\t")
    ingredient = fields[0]
    locations = []

    # Process and convert degrees to
    for coordinates in fields[1:]:
        lat, long, code1, code2 = coordinates.split(",")
        lat, long = radians(float(lat)), radians(float(long))
        locations.append((lat, long))

    nb_clusters = min(K, len(coordinates))
    clusters = [random.randint(0, nb_clusters-1) for i in range(len(locations))]

    for step in range(MAX_STEPS):
        # Recompute centers
        # print("+++ Computing centers")

        centers = [[] for k in range(nb_clusters)]
        counts = [0 for k in range(nb_clusters)]
        for m in range(len(locations)):
            # print(m, clusters[m], locations[m], centers[clusters[m]])
            centers[clusters[m]].append(locations[m])

        for k in range(nb_clusters):
            if len(centers[k]) == 0:
                centers[k] = None
            elif len(centers[k]) == 1:
                centers[k] = centers[k][0]
            elif len(centers[k]) > 1:
                centers[k] = center_geolocation(centers[k])


        # Assign clusters to locations
        changes = 0
        for m in range(len(locations)):
            loc = locations[m]
            mindist = sys.float_info.max
            argmin = 0
            for k in range(nb_clusters):
                center = centers[k]
                if center is None:
                    continue
                # print(loc, center)
                d = geocalc(loc[0], loc[1], center[0], center[1])
                # print("d(%s,cluster %s) = %f" % (m, k, d))
                if d < mindist:
                    argmin = k
                    mindist = d
            if clusters[m] != argmin:
                changes += 1
            clusters[m] = argmin
            counts[argmin] += 1


        # print("===")
        # print(step, changes, centers, clusters)
        if float(changes) / float(len(coordinates)) < CHANGE_THRESHOLD:
            break

    for k in range(len(centers)):
        center = centers[k]
        if center is not None:
            if counts[k] / float(len(locations)) >= MIN_SUPPORT:
                print("INSERT INTO Geo VALUES('%s', POINT(%f, %f));" % (ingredient.replace("'", "''"), center[1], center[0]))

    count += 1
    if count % 100 == 0:
        logger.info("Processed %d items", count)
