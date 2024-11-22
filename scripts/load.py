#!/usr/bin/env python3

"""

Load GRIN passport data for genus into postgresql genus table,
with same column names.

Germplasm JSON can be downloaded from here:

https://npgsweb.ars-grin.gov/gringlobal/brapi/v2/germplasm/<germplasmDbId>?genus=<Genus>

Expects JSON on stdin:

 ./load.py < Arachis.json

for g in Apios Arachis Cajanus Chamaecrista Cicer Glycine Lens Lotus Lupinus \
     Medicago Phaseolus Pisum Trifolium Vicia Vigna;
      do
      echo $g; ./load.py < $g.json;
      done

"""

import json
import psycopg2
import datetime
import sys

DATE_FMT = '%Y%m%d'
PNT_FMT = "ST_GeographyFromText('SRID=4326;POINT(%(longdec)s %(latdec)s)')"


def main():
    conn = psycopg2.connect()
    cur = conn.cursor()
    germplasm = json.load(sys.stdin)
    inserts = 0
    for n in germplasm:
        acqdate = None
        if n['acquisitionDate']: 
            try:
                acqdate = datetime.datetime.fromisoformat(n['acquisitionDate']).date()
            except ValueError:
                pass
        coordinates = n["germplasmOrigin"][0]["coordinates"]["geometry"]["coordinates"]
        if len(coordinates) == 2:
            longdec, latdec = (coordinates[0], coordinates[1])
            geographic_coord = f'POINT({longdec} {latdec})'
        else:
            longdec, latdec = (0.0, 0.0)
            geographic_coord = None

        sql = """INSERT INTO lis_germplasm.grin_accession
        (taxon,genus,species,spauthor,subtaxa,subtauthor,
        cropname,avail,instcode,accenumb,acckey,collnumb,collcode,taxno,
        accename,acqdate,origcty,collsite,latitude,longitude,elevation,
        colldate,bredcode,sampstat,ancest,collsrc,donorcode,donornumb,
        othernumb,duplsite,storage,latdec,longdec,geographic_coord,remarks,
        history,released,is_legume)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,ST_GeographyFromText(%s),
        %s,%s,%s, true);"""
        values = (
            " ".join(filter(None, (n["genus"], n["species"],
                     (n["subtaxa"] and f"subsp. {n['subtaxa']}") or None))), # taxon
            n["genus"], # genus
            n["species"], # species
            n["speciesAuthority"], # spauthor
            n["subtaxa"], # subtaxa
            n["subtaxaAuthority"], # subtauthor
            n["commonCropName"], # cropname
            (n["additionalInfo"] or {}).get("IsAvailable", ""), # avail
            n["instituteCode"], # instcode
            n.get("accessionNumber", "").rstrip() or None, # accenumb (on't allow empty strings)
            int(n["germplasmDbId"]), # acckey
            "", # collnumb
            "", # collcode
            int(n['taxonIds'][0]['taxonId']), # taxno
            "", # accename
            acqdate, # acqdate
            n["countryOfOriginCode"], # origcty
            n["seedSourceDescription"], # collsite
            None, # latitude # FIXME
            None, # longitude # FIXME
            0, # elevation
            None, # colldate
            "", # bredcode
            int(n["biologicalStatusOfAccessionCode"]), # sampstat
            "", # ancest
            0, # collsrc
            n["donors"][0]["donorInstituteCode"], # donorcode
            n["donors"][0]["donorAccessionNumber"], # donornumb
            "", # othernumb
            "", # duplsite
            n["storageTypes"][0]["code"], # storage
            latdec, # latdec
            longdec, # longdec
            geographic_coord, # geographic_coord
            (n["additionalInfo"] or {}).get("Note", ""), # remarks
            "", # history
            "" # released
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
