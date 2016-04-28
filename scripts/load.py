#!/usr/bin/env python

"""

Load GRIN passport data for genus into postgresql genus table,
with same column names.

CSV files can be downloaded from here:

http://www.ars-grin.gov/~dbmuqs/cgi-bin/ex_mcpd.pl?genus=<Genus>

Expects csv on stdin:

 ./load.py < Arachis.csv

for g in Apios Arachis Cajanus Chamaecrista Cicer Glycine Lens Lotus Lupinus \
     Medicago Phaseolus Pisum Trifolium Vicia Vigna;
      do
      echo $g; ./load.py < $g-passport.csv;
      done

"""

import petl as etl
import psycopg2
from datetime import datetime as dt

PSQL_DB = 'dbname=drupal user=www'
DATE_FMT = '%Y%m%d'
PNT_FMT = "ST_GeographyFromText('SRID=4326;POINT(%(longdec)s %(latdec)s)')"


def main():
    conn = psycopg2.connect(PSQL_DB)
    cur = conn.cursor()
    table = etl.csv.fromcsv(encoding='latin1')
    inserts = 0
    for n in etl.dicts(table):
        n['acckey'] = int(n['acckey'] or 0)
        n['taxno'] = int(n['taxno'] or 0)
        n['elevation'] = int(n['elevation'] or 0)
        n['sampstat'] = int(n['sampstat'] or 0)
        n['collsrc'] = int(n['collsrc'] or 0)
        n['longdec'] = float(n['longdec'] or 0)
        n['latdec'] = float(n['latdec'] or 0)
        n['accenumb'] = n['accenumb'] or None  # don't allow empty strings
        if n['acqdate']: 
            n['acqdate'] = n['acqdate'].replace('--', '01')
            try:
                date = dt.strptime(n['acqdate'], DATE_FMT).date()
                n['acqdate'] = date
            except ValueError:
                n['acqdate'] = None
        else:
            n['acqdate'] = None
        if n['colldate']:
            n['colldate'] = n['colldate'].replace('--', '01') 
            try: 
                date = dt.strptime(n['colldate'], DATE_FMT).date()
                n['colldate'] = date
            except ValueError:
                n['colldate'] = None
        else:
            n['colldate'] = None
        if n['longdec'] and n['latdec']:
            geographic_coord = PNT_FMT
        else:
            geographic_coord = 'NULL'

        sql = """INSERT INTO lis_germplasm.grin_accession
        (taxon,genus,species,spauthor,subtaxa,subtauthor,
        cropname,avail,instcode,accenumb,acckey,collnumb,collcode,taxno,
        accename,acqdate,origcty,collsite,latitude,longitude,elevation,
        colldate,bredcode,sampstat,ancest,collsrc,donorcode,donornumb,
        othernumb,duplsite,storage,latdec,longdec,geographic_coord,remarks,
        history,released,is_legume)
        VALUES (%(taxon)s,%(genus)s,%(species)s,%(spauthor)s,%(subtaxa)s,
        %(subtauthor)s,%(cropname)s,%(avail)s,%(instcode)s,%(accenumb)s,
        %(acckey)s,%(collnumb)s,%(collcode)s,%(taxno)s,%(accename)s,%(acqdate)s,
        %(origcty)s,%(collsite)s,%(latitude)s,%(longitude)s,%(elevation)s,
        %(colldate)s,%(bredcode)s,%(sampstat)s,%(ancest)s,%(collsrc)s,
        %(donorcode)s,%(donornumb)s,%(othernumb)s,%(duplsite)s,%(storage)s,
        %(latdec)s,%(longdec)s,""" + geographic_coord + """,
        %(remarks)s,%(history)s,%(released)s, true);"""
        # print(cur.mogrify(sql, n))
        try:
            cur.execute(sql, n)
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
