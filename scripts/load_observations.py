#!/usr/bin/env python3

import json
import os
import psycopg2
import psycopg2.extras
import sys

def main():
    conn = psycopg2.connect()
    cur = conn.cursor()
    observations = json.load(sys.stdin)

    # https://stackoverflow.com/a/39034789
    psycopg2.extras.execute_values(cur,
        ("INSERT INTO lis_germplasm.legumes_grin_evaluation_data "
         "(accession_prefix, accession_number, observation_value, descriptor_name,"
         " accession_surfix, accenumb) VALUES %s"),
        ((obs["germplasmName"].split()[0], # accession_prefix
          obs["germplasmName"].split()[1], # accession_number
          obs["value"],                    # observation_value
          obs["observationVariableName"],  # descriptor_name
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
