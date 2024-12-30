#!/usr/bin/env python3

import json
import os
import sys
import urllib.request

def main():
    BRAPI_URL = os.environ["BRAPI_URL"]
    observations = []
    trait_num=0
    traits = json.load(sys.stdin)
    for trait in traits:
        trait_num+=1
        page = 0
        while True:
            print(f"fetching observations for trait ({trait_num} / {len(traits)}): {trait['traitDbId']}",file=sys.stderr)
            try:
                observations_response = json.loads(
                                             urllib.request.urlopen(
                                                 f"{BRAPI_URL}/observations?observationVariableDbId={trait['traitDbId']}&page={page}"
                                             ).read().decode("utf-8"))
                observations.extend(observations_response["result"]["data"])
                if observations_response["metadata"]["pagination"]["currentPage"]+1 \
                   >= observations_response["metadata"]["pagination"]["totalPages"]:
                   break
                page+=1
            # GRIN has "lots of traits loaded into the system that have never had measurements/observations collected on them"
            except urllib.error.HTTPError as err:
                if err.code == 404:
                    print(f"{trait['traitDbId']} no observations found", file=sys.stderr)
                    break
                else:
                    raise

    json.dump(observations, sys.stdout)

if __name__ == "__main__":
    main()
