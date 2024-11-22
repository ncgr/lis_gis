#!/usr/bin/env python3

import json
import os
import sys
import urllib.request

BRAPI_URL = os.environ["BRAPI_URL"]
genus = sys.argv[1]

germplasm = []
page=0

while True:
    germplasm_page = json.loads(urllib.request.urlopen(f"{BRAPI_URL}/germplasm?genus={genus}&page={page}").read().decode("utf-8"))
    germplasm.extend(germplasm_page["result"]["data"])
    currentPage = germplasm_page["metadata"]["pagination"]["currentPage"]
    pageSize = germplasm_page["metadata"]["pagination"]["pageSize"]
    totalCount = germplasm_page["metadata"]["pagination"]["totalCount"]
    totalPages = germplasm_page["metadata"]["pagination"]["totalPages"]
    if currentPage+1 < totalPages:
        print(f"{genus}: {(currentPage+1)*pageSize} / {totalCount}", file=sys.stderr)
        page+=1
    else:
        print(f"{genus}: {totalCount} / {totalCount}", file=sys.stderr)
        break

json.dump(germplasm, sys.stdout)
