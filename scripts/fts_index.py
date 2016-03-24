#!/usr/bin/env python

"""
Update the FTS index for the taxon field. Should be done after all
genera are loaded/updated.
"""

import psycopg2

PSQL_DB = 'dbname=drupal user=www'
DATE_FMT = '%Y%m%d'
PNT_FMT = "ST_GeographyFromText('SRID=4326;POINT(%(longdec)s %(latdec)s)')"


def main():
    print('updating full text search index...')
    conn = psycopg2.connect(PSQL_DB)
    cur = conn.cursor()
    sql = '''UPDATE lis_germplasm.grin_accession
             SET taxon_fts = to_tsvector('english', coalesce(taxon,'')) '''
    cur.execute(sql)
    conn.commit()


if __name__ == '__main__':
    main()
