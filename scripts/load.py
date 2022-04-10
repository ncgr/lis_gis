#!/usr/bin/env python

"""

Load GRIN passport data for genus into postgresql genus table,
with same column names.

MCPD JSON can be downloaded from here:

https://npgstest2.agron.iastate.edu/gringlobal/BrAPI/V2/germplasm/<germplasmDbId>/mcpd

Expects JSON on stdin:

 ./load.py < MCPD.json

for g in Apios Arachis Cajanus Chamaecrista Cicer Glycine Lens Lotus Lupinus \
     Medicago Phaseolus Pisum Trifolium Vicia Vigna;
      do
      echo $g; ./load.py < $g-passport.json;
      done

"""

import json
import psycopg2
import sys
from datetime import datetime as dt

DATE_FMT = '%Y%m%d'


def main():
    conn = psycopg2.connect()
    cur = conn.cursor()
    germplasm = json.load(sys.stdin)
    inserts = 0
    for n in germplasm:
        if n["acquisitionDate"]: 
            n["acquisitionDate"] = n["acquisitionDate"].replace("--", "01")
            try:
                date = dt.strptime(n["acquisitionDate"], DATE_FMT).date()
                n["acquisitionDate"] = date
            except ValueError:
                n["acquisitionDate"] = None
        else:
            n["acquisitionDate"] = None
        if n["collectingInfo"]["collectingDate"]:
            n["collectingInfo"]["collectingDate"] = n["collectingInfo"]["collectingDate"].replace("--", "01") 
            try: 
                date = dt.strptime(n["collectingInfo"]["collectingDate"], DATE_FMT).date()
                n["collectingInfo"]["collectingDate"] = date
            except ValueError:
                n["collectingInfo"]["collectingDate"] = None
        else:
            n["collectingInfo"]["collectingDate"] = None
        if n["collectingInfo"]["collectingSite"]["longitudeDecimal"] and n["collectingInfo"]["collectingSite"]["latitudeDecimal"]:
            geographic_coord = f'POINT({n["collectingInfo"]["collectingSite"]["longitudeDecimal"]} {n["collectingInfo"]["collectingSite"]["latitudeDecimal"]})'
        else:
            geographic_coord = None

        sql = """INSERT INTO lis_germplasm.grin_accession
        (taxon,genus,species,speciesAuthority,subtaxon,subtaxonAuthority,
        commonCropName,instituteCode,accenumb,germplasmDbId,collectingNumber,collectingInstitutes,
        accessionNames,acquisitionDate,countryOfOrigin,locationDescription,elevation,
        collectingDate,breedingInstitutes,biologicalStatusOfAccessionCode,ancestralData,acquisitionSourceCode,donorInstitute,donorAccessionNumber,
        safetyDuplicateInstitutes,storageTypeCodes,latitudeDecimal,longitudeDecimal,geographic_coord,remarks,
        history)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,ST_GeographyFromText(%s),%s,%s);"""
        values = (
            # taxon: BrAPI v2 mcpd doesn"t have an equivalent, so we"re faking it
            " ".join(filter(None, (n["genus"], n["species"],
                     (n["subtaxon"] and f"subsp. {n['subtaxon']}") or None))), # TODO
            n["genus"], # genus
            n["species"], # species
            n["speciesAuthority"], # spauthor
            n["subtaxon"], # subtaxa
            n["subtaxonAuthority"], # subtauthor
            n["commonCropName"], # cropname
            n["instituteCode"], # instcode
            (n.get("accessionNumber", "").rstrip() or None), # accenumb (NOTE: notified Pete of trailing space issue) # TODO
            int(n["germplasmDbId"]), # acckey
            n["collectingInfo"]["collectingNumber"], # collnumb
            ";".join((institute["instituteCode"] for institute in n["collectingInfo"]["collectingInstitutes"])), # collcode
            ";".join(n["accessionNames"]), # accename
            n["acquisitionDate"], #acqdate
            n["countryOfOrigin"], #origcty
            n["collectingInfo"]["collectingSite"]["locationDescription"], #collsite
            int(n["collectingInfo"]["collectingSite"]["elevation"] or 0), #elevation
            n["collectingInfo"]["collectingDate"], # colldate
            ";".join(n["breedingInstitutes"]), # bredcode
            int(n["biologicalStatusOfAccessionCode"] or 0), # sampstat
            n["ancestralData"], # ancest
            int(n["acquisitionSourceCode"] or 0), # collsrc
            n["donorInfo"]["donorInstitute"]["instituteCode"], # donorcode
            n["donorInfo"]["donorAccessionNumber"], # donornumb
            ";".join(n["safetyDuplicateInstitutes"]), # duplsite
            ";".join(n["storageTypeCodes"]), # storage
            float(n["collectingInfo"]["collectingSite"]["latitudeDecimal"] or 0), # latdec
            float(n["collectingInfo"]["collectingSite"]["longitudeDecimal"] or 0), # longdec
            geographic_coord,
            n["remarks"], # remarks
            "", # FIXME: history (could partially fake with germplasm seedSource and seedSourceDescription ?
        )

        # print(cur.mogrify(sql, n))
        try:
            cur.execute(sql, values)
            conn.commit()
            inserts += 1
        except psycopg2.Error as e:
            print(e)
            conn.rollback()
            
    conn.commit()
    print('\tinserted: %d' % inserts)


def _dictfetchall(cursor):
    """Return all rows from a cursor as a dict"""
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


if __name__ == '__main__':
    main()
