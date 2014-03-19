import argparse
import logging
import re
import os


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("match_titles")

parser = argparse.ArgumentParser()
parser.add_argument("dir", help="Directory where the different files have to be stored")
parser.add_argument("titles", nargs="+", help="List of Wikipedia file (XML simple format)")

args = parser.parse_args()


re_doc = re.compile(r"""<doc id="(\d+)" url="[^"]+" title="([^"]+)">""")
re_enddoc = re.compile(r"""</doc>""")

basedir = os.path.abspath(args.dir)
indexpath = os.path.join(basedir, "index")
if not os.path.exists(indexpath):
    os.mkdir(indexpath)
indrifile = open(os.path.join(args.dir, "indri.conf"), "wt")
indrifile.write("""<parameters>
    <index>%s</index>
    <memory>1G</memory>
    <corpus>
      <path>%s/trec.dat</path>
      <class>trectext</class>
    </corpus>
    <stemmer><name>krovetz</name></stemmer>
  </parameters>""" % (indexpath, basedir))
indrifile.close()

trecfile = open(os.path.join(args.dir, "trec.dat"), "wt")
indexfile = open(os.path.join(args.dir, "index.dat"), "wt")

pos = -1

for filepath in args.titles:
    logger.info("Processing %s" % filepath)
    f = open(filepath, "rt")
    filename = os.path.basename(filepath)

    while True:
        oldpos = pos
        pos = f.tell()
        line = f.readline()
        if line is None or pos == oldpos:
            break

        m = re_doc.match(line)
        if m is not None:
            id = m.group(1)
            title = m.group(2)
            start = pos
            logger.debug("Matching [%s]", title)
        elif re_enddoc.match(line) is not None:
            trecfile.write("""<DOC>
 <DOCNO>%s</DOCNO>
 <TEXT>%s</TEXT>
</DOC>\n""" % (id, title))
            indexfile.write("%s\t%s\t%s\t%d\t%d\n" % (id, title, filename, start, f.tell()))

    f.close()

trecfile.close()
indexfile.close()