#!/usr/bin/env python3

# USAGE
#     load_observations.py TRAITS_JSON[.gz] OBSERVATIONS_JSON[.gz]

import gzip
import json
import os
import psycopg2
import psycopg2.extras
import sys

def open_gz(path):
    return gzip.open(path) if path.endswith(".gz") else open(path)

def main():
    conn = psycopg2.connect()
    cur = conn.cursor()

    traits = json.load(open_gz(sys.argv[1]))
    observations = json.load(open_gz(sys.argv[2]))

    # https://stackoverflow.com/a/39034789
    psycopg2.extras.execute_values(cur,
        ("INSERT INTO lis_germplasm.legumes_grin_evaluation_data "
         "(accession_prefix, accession_number, observation_value, descriptor_name,"
         " accession_surfix, accenumb) VALUES %s"),
        ((obs["germplasmName"].split()[0], # accession_prefix
          obs["germplasmName"].split()[1], # accession_number
          obs["value"],                    # observation_value
          next(trait["traitName"]
               for trait in traits
               if trait["traitDbId"] == obs["observationVariableDbId"]), # descriptor_name
          (" ".join(obs["germplasmName"].split()[2:])
               if len(obs["germplasmName"].split()) > 2
               else ""),                   # accession_surfix

          obs["germplasmName"].rstrip() # accenumb
        ) for obs in observations))

    conn.commit()
    
    # TODO: normalize so taxon isn't replicated in legumes_grin_evaluation_data
    cur.execute(("UPDATE lis_germplasm.legumes_grin_evaluation_data AS observations "
                 "SET taxon = germplasm.taxon "
                 "FROM lis_germplasm.grin_accession AS germplasm "
                 "WHERE observations.accenumb = germplasm.accenumb"))
    conn.commit()
     

if __name__ == "__main__":
    main()
