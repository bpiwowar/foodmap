import sys
import numpy
import argparse
# import heapq
# from lm1utils import loadModel
# import shlex

# Avoid using X for matplotlib
import matplotlib as mpl
mpl.use('Agg')
import matplotlib.pyplot as plt

# Captures exceptions in C++ modules to show the backtrace
import faulthandler
faulthandler.enable()

# from wordmodules import *
from struct import calcsize, pack, unpack
from tempfile import mkdtemp
from shutil import rmtree
from os.path import join as path_join
from subprocess import Popen
# from numpy.random import standard_cauchy, uniform

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("words")

BH_TSNE_BIN_PATH='bh_tsne'

def _read_unpack(fmt, fh):
    return unpack(fmt, fh.read(calcsize(fmt)))


class TmpDir:
    def __enter__(self):
        self._tmp_dir_path = mkdtemp()
        return self._tmp_dir_path

    def __exit__(self, type, value, traceback):
        rmtree(self._tmp_dir_path)


def command_t_sne(words, dimension, args):
    sample_count = len(words)

    with TmpDir() as tmp_dir_path:
            # Note: The binary format used by bh_tsne is roughly the same as for
            #   vanilla tsne
            logger.info("Writing data file")
            with open(path_join(tmp_dir_path, 'data.dat'), 'wb') as data_file:
                    # Write the bh_tsne header

                    data_file.write(pack('iidd', sample_count, dimension, args.theta, args.perplexity))
                    # Then write the data
                    for word in words:
                            v = word["vector"]
                            if v is None:
                                    continue
                            v = [x for x in v[:]]
                            # print v[0:10]
                            data_file.write(pack('{}d'.format(len(v)), *v))

            # Call bh_tsne and let it do its thing
            logger.info("Learn")
            with open('/dev/null', 'w') as dev_null:
                    bh_tsne_p = Popen((BH_TSNE_BIN_PATH, ), cwd=tmp_dir_path,
                                    # bh_tsne is very noisy on stdout, tell it to use stderr
                                    #   if it is to print any output
                                    stdout=sys.stderr if args.verbose else dev_null)
                    bh_tsne_p.wait()
                    assert not bh_tsne_p.returncode, ('ERROR: Call to bh_tsne exited '
                                    'with a non-zero return code exit status, please ' +
                                    ('enable verbose mode and ' if not args.verbose else '') +
                                    'refer to the bh_tsne output for further details')

            # Read and pass on the results
            with open(path_join(tmp_dir_path, 'result.dat'), 'rb') as output_file:
                    # The first two integers are just the number of samples and the
                    #   dimensionality
                    result_samples, result_dims = _read_unpack('ii', output_file)
                    # Collect the results, but they may be out of order
                    results = [_read_unpack('{}d'.format(result_dims), output_file) for _ in range(result_samples)]
                    # Now collect the landmark data so that we can return the data in
                    #   the order it arrived
                    results = [(_read_unpack('i', output_file), e) for e in results]
                    # Put the results in order and yield it
                    results.sort()
                    i = 0

                    pdf = args.pdf is not None
                    if pdf:
                            plt.figure(figsize=(50, 50))
                            xmin, xmax, ymin, ymax = 0, 0, 0, 0
                            for _, result in results:
                                    # print result
                                    xmin, xmax = min(result[0], xmin), max(result[0], xmax)
                                    ymin, ymax = min(result[1], ymin), max(result[1], ymax)
                            plt.xlim(xmin, xmax)
                            plt.ylim(ymin, ymax)

                            plt.xticks([])
                            plt.yticks([])

                    for _, result in results:
                            sys.stdout.write('{}\t{}\t{}\n'.format(words[i], *result))
                            if pdf:
                                    plt.text(result[0], result[1], words[i]["word"])
                            i = i + 1
                    if pdf:
                            plt.savefig(args.pdf, format='pdf')
                    if args.png is not None:
                            plt.savefig(args.png, format='png')

    logger.info("Done")

p_tsne = argparse.ArgumentParser("t-sne")
p_tsne.add_argument("words", type=file)
p_tsne.add_argument('-t', '--theta', type=float, default=0.5)
p_tsne.add_argument('--limit', type=int, default=sys.maxint, help="Limit the number of words")
p_tsne.add_argument('-p', '--perplexity', type=float, default=30.0)
p_tsne.add_argument('--bin-path', type=str, default=BH_TSNE_BIN_PATH)
p_tsne.add_argument('--verbose', default=False, action='store_true')
p_tsne.add_argument('--pdf')
p_tsne.add_argument('--png')
args = p_tsne.parse_args()

logger.info("Parsing")
f = open("words.txt")
nb_words, dimension = [int(x) for x in f.readline().strip().split(" ")]
words = []
for i in range(min(nb_words, 1000)):
    fields = f.readline().strip().split(" ")
    words.append(dict(word=fields[0], vector=numpy.array([float(x) for x in fields[1:]])))
f.close()
command_t_sne(words, dimension, args)
