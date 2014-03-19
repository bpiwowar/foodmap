# Pre-processing

## Process wikipedia titles

    python2.7 foodmap/scripts/extract_wikititles.py data/wikititles data/wiki/wiki_??

## Index with Indri

    IndriBuildIndex data/wikititles/indri.conf

## Titles

python foodmap/scripts/match_titles.py data/wikititles/index data/wikititles/index.dat foodmap/files/ingredients > foodmap/files/ingredients_matched

python foodmap/scripts/extract_recipes.py data_json/recipe/03_11_2013.json  > recipes.txt
python foodmap/scripts/match_titles.py data/wikititles/index data/wikititles/index.dat recipes.txt > recipes_matched.txt
