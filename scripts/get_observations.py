#!/usr/bin/env python3

import json
import os
import sys
import urllib.request

def main():
    BRAPI_URL = os.environ["BRAPI_URL"]
    observations = []
    for commonCropName in {
        germplasm["commonCropName"]
        for germplasm
        in json.load(sys.stdin)
        if germplasm["commonCropName"]
        # work around Vigna data anomolies
        and germplasm["commonCropName"] not in {'OKRA', 'TOMATO'}
        and not (germplasm["genus"] == "Vigna" and germplasm["commonCropName"] == "PHASEOLUS")}:

        traits = json.loads(urllib.request.urlopen(f"{BRAPI_URL}/traits?commonCropName={commonCropName}").read().decode("utf-8"))
        # not handling multiple pages for convenience; should never occur, but verify just in case
        if traits["metadata"]["pagination"]["totalPages"] > 1:
            raise ValueError(f"{commonCropName} traits totalPages: {totalPages} > 1")

        trait_num=0
        for trait in traits["result"]["data"]:
            trait_num+=1
            page = 0
            while True:
                print(f"{commonCropName}: fetching observations for trait ({trait_num} / {len(traits['result']['data'])}): {trait['traitDbId']}",file=sys.stderr)
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
                        print(f"{commonCropName}: {trait['traitDbId']} no observations found", file=sys.stderr)
                        break
                    else:
                        raise

    json.dump(observations, sys.stdout)

if __name__ == "__main__":
    main()
