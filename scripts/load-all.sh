#!/bin/sh

set -o errexit -o nounset -o pipefail

# load/update all legumes genera,
# update full text search index,
# update lat/long consensus.

download_only=false

while getopts d opt
do
  case ${opt} in
  d) download_only=true ;;
  esac
done

shift $((OPTIND-1))

if [ $# -gt 0 ]
then
  genera="$@"
else
  genera='Apios Arachis Cajanus Chamaecrista Cicer Glycine Lens Lotus Lupinus Medicago Phaseolus Pisum Trifolium Vicia Vigna'
fi

# download germplasm and observations JSON
for genus in ${genera}
do
  germplasm=data/germplasm-${genus}.json.gz
  traits=data/traits-${genus}.json.gz
  observations=data/observations-${genus}.json.gz
  if [ ! -s ${germplasm} ]
  then
    echo "fetching germplasm for ${germplasm}" 1>&2
    get_germplasm.py ${genus} | gzip -9 > ${germplasm}
  fi
  if [ ! -s ${traits} ]
  then
    echo "fetching traits for ${germplasm}" 1>&2
    gzip -dc ${germplasm} | get_traits.py | gzip -9 > ${traits}
  fi
  if [ ! -s ${observations} ]
  then
    echo "fetching observations for ${germplasm}" 1>&2
    gzip -dc ${traits} | get_observations.py | gzip -9 > ${observations}
  fi
done

# load data/*.json
if ! ${download_only}
then
  for genus in ${genera}
  do
    echo "loading data/germplasm-${genus}.json" 1>&2
    gzip -dc data/germplasm-${genus}.json.gz | load.py
    echo "loading data/observations-${genus}.json" 1>&2
    gzip -dc data/observations-${genus}.json.gz | load_observations.py
  done
  latlng_consensus.py
  fts_index.py
  evaluation_metadata.py
fi
