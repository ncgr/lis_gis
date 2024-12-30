#!/usr/bin/env python3

import json
import os
import sys
import urllib.request

def main():
    BRAPI_URL = os.environ["BRAPI_URL"]
    traits = []
    for commonCropName in {
        germplasm["commonCropName"]
        for germplasm
        in json.load(sys.stdin)
        if germplasm["commonCropName"]
        # work around Vigna data anomolies
        and germplasm["commonCropName"] not in {'OKRA', 'TOMATO'}
        and not (germplasm["genus"] == "Vigna" and germplasm["commonCropName"] == "PHASEOLUS")}:

        traits_response = json.loads(urllib.request.urlopen(f"{BRAPI_URL}/traits?commonCropName={commonCropName}").read().decode("utf-8"))
        # not handling multiple pages for convenience; should never occur, but verify just in case
        if traits_response["metadata"]["pagination"]["totalPages"] > 1:
            raise ValueError(f"{commonCropName} traits totalPages: {totalPages} > 1")

        traits.extend(traits_response['result']['data'])

    json.dump(traits, sys.stdout)

if __name__ == "__main__":
    main()
