# Match titles

import argparse
import logging
import tempfile
import os
from subprocess import Popen
import subprocess
import sys


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("match_titles")

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument("--indri-run", default="IndriRunQuery")
parser.add_argument("indexdir", help="Indri index")
parser.add_argument("titles", help="Indri file")
parser.add_argument("queries", help="Queries (one per line)")

# args = parser.parse_args(["data/wikititles/index", "data/wikititles/index.dat", "ingredients_100"])
args = parser.parse_args()


# --- Searching
queryfile = tempfile.NamedTemporaryFile()
queryfile.write("""
<parameters>
    <index>%s</index>
    <stemmer><name>krovetz</name></stemmer>
    <trecFormat>true</trecFormat>
""" % (os.path.abspath(args.indexdir)))

queries = []
for query in open(args.queries):
    query = query.strip().split("\t", 1)[0]
    queryfile.write("""
    <query>
        <number>%d</number>
        <text>#combine(#band(%s) %s)</text>
    </query>
""" % (len(queries), query, query))
    queries.append(query)


queryfile.write("</parameters>\n")
queryfile.flush()

logger.info("Launching indri with %s", queryfile.name)
process = Popen([args.indri_run, queryfile.name], stdout=subprocess.PIPE)
results = {}
for line in process.stdout:
    query_id, _, docid, rank, score, _ = line.strip().split(" ")
    if query_id not in results:
        logging.info("Results for query %s", query_id)
        results[query_id] = {}
    results[query_id][docid] = score


queryfile.close()

# --- Process titles
logger.info("Reading title index")

titles = {}
count = 0
try:
    for line in open(args.titles):
        id, title, filename, start, end = line.strip().split("\t")

        titles[id] = title

        count += 1
        if count % 10000 == 0:
            logger.info("Processed %d titles", count)
except Exception as e:
    logger.error("Exception: %s", e)


# --- Processing results

def ngram_match(a, b, n=3):
    n = min(len(a), len(b), n)

    l = {}
    for i in range(len(a) - n + 1):
        v = a[i:(i + n)]
        l[v] = l.get(v, 0) + 1

    count_a = 0
    count_b = 0

    for i in range(len(b) - n + 1):
        v = b[i:(i + n)]
        x = l.get(v, 0)
        count_b += x
        if x > 0:
            count_a += 1

    return (count_a / float(len(a) - n + 1) , count_b / float(len(b) - n + 1))

for query_id, query_results in results.items():
    query_id = int(query_id)
    query = queries[query_id]
    logging.info("Processing [%s] %s", query_id, query)
    if len(query_results) == 0:
        logger.error("No result for query [%s]" % query)

    max_score = -sys.maxint
    for doc_id, score in query_results.items():
        # print(query, titles[doc_id], ngram_match(query, titles[doc_id], 3))
        scores = ngram_match(titles[doc_id].lower(), query.lower(), 5)
        score = float(scores[1]) * float(scores[0])
        if score > max_score:
            max_score = score
            argmax = doc_id

    print("%s\t%s\t%s\t%s" % (query, argmax, max_score, titles[argmax]))
