#!/bin/bash

# load/update all legumes genera,
# update full text search index,
# update lat/long consensus.

for g in Apios Arachis Cajanus Chamaecrista Cicer Glycine Lens Lotus Lupinus Medicago Phaseolus Pisum Trifolium Vicia Vigna;
do
    echo $g
    curl -s -o $g.csv \
         http://www.ars-grin.gov/~dbmuqs/cgi-bin/ex_mcpd.pl?genus=$g
    ./load.py < $g.csv
    rm $g.csv
done

./latlng_consensus.py
./fts_index.py
