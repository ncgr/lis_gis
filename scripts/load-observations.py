#!/usr/bin/env python

"""

Load GRIN observation data into postgres

MCPD JSON can be downloaded from germplasm mcpd JSON thus:

for germplasmDbId in $(jq '.[].germplasmDbId' < germplasm-mcpd.json | tr -d '"')
do
  curl "https://npgstest2.agron.iastate.edu/gringlobal/BrAPI/V2/observations?germplasmDbId=${germplasmDbId}"
done | jq '.result | select(. != null) | .data' | jq -s 'add' > observations.json

 ./load-observations.py < observations.json

"""

import json
import psycopg2
import sys
from datetime import datetime as dt

DATE_FMT = '%Y%m%d'


def main():
    conn = psycopg2.connect()
    cur = conn.cursor()
    observations = json.load(sys.stdin)
    inserts = 0
    errors = 0
    for obs in observations:
        sql = """INSERT INTO lis_germplasm.legumes_grin_evaluation_data
        VALUES (
            %(observationDbId)s,
            %(germplasmDbId)s,
            %(value)s,
            %(observationVariableName)s,
            %(additionalInfo)s
        )"""

        # print(cur.mogrify(sql, n))
        try:
            cur.execute(sql, obs)
            conn.commit()
            inserts += 1
        except psycopg2.Error as e:
            print(e)
            conn.rollback()
            errors += 1

    conn.commit()
    print('\tinserted: %d' % inserts)
    print('\terrors: %d' % errors)


if __name__ == '__main__':
    main()
