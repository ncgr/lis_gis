#!/usr/bin/env python

"""
QA the data, update db wit a concensus for sign of latitude and
longitude values for each country. Some of the lat/long signs are
missing or wrong, locating the accessions in the wrong hemisphere.
"""

import psycopg2
import math

PSQL_DB = 'dbname=drupal user=www'
DATE_FMT = '%Y%m%d'
PNT_FMT = "ST_GeographyFromText('SRID=4326;POINT(%(longitudeDecimal)s %(latitudeDecimal)s)')"

if not hasattr(math, 'isclose'):
    # monkey patch for python2
    def isclose(a, b, rel_tol=1e-09, abs_tol=0.0):
        return abs(a - b) <= max(rel_tol * max(abs(a), abs(b)), abs_tol)
    math.isclose = isclose


def main():
    print('making lat/long consensus...')
    conn = psycopg2.connect(PSQL_DB)
    cur = conn.cursor()
    sql = '''SELECT distinct countryOfOrigin 
    FROM lis_germplasm.grin_accession
    ORDER BY countryOfOrigin
    '''
    cur.execute(sql)
    countries = [row[0] for row in cur.fetchall()]
    for country in countries:
        print(country)
        cons = {
            'latitudeDecimal': {
                'pos_count': 0,
                'neg_count': 0,
            },
            'longitudeDecimal': {
                'pos_count': 0,
                'neg_count': 0,
            },
        }
        sql = '''
        SELECT latitudeDecimal, longitudeDecimal, countryOfOrigin
        FROM lis_germplasm.grin_accession 
        WHERE countryOfOrigin = %(country)s
        '''
        params = {'country': country}
        cur.execute(sql, params)
        recs = _dictfetchall(cur)
        for rec in recs:
            if not math.isclose(rec['longitudeDecimal'], 0.0, abs_tol=0.00001):
                # have a nonzero longitude
                if rec['longitudeDecimal'] > 0:
                    cons['longitudeDecimal']['pos_count'] += 1
                elif rec['longitudeDecimal'] < 0:
                    cons['longitudeDecimal']['neg_count'] += 1
            if not math.isclose(rec['latitudeDecimal'], 0.0, abs_tol=0.00001):
                # have a nonzero longitude
                if rec['latitudeDecimal'] > 0:
                    cons['latitudeDecimal']['pos_count'] += 1
                elif rec['latitudeDecimal'] < 0:
                    cons['latitudeDecimal']['neg_count'] += 1
        # update latitudes
        if cons['latitudeDecimal']['pos_count'] > 0 and cons['latitudeDecimal']['neg_count'] > 0:
            print(country)
            print(cons)
            # need to update in light of consensus
            if cons['latitudeDecimal']['pos_count'] == cons['latitudeDecimal']['neg_count']:
                print('****** warning-- no consensus! *******')
                continue

            neg_sign = (cons['latitudeDecimal']['pos_count'] < cons['latitudeDecimal']['neg_count'])
            if neg_sign:  # consensus is negative signed latitude
                sql = '''
                UPDATE lis_germplasm.grin_accession
                SET latitudeDecimal = latitudeDecimal * -1 
                WHERE latitudeDecimal > 0
                AND countryOfOrigin = %(country)s
                '''
            else:  # consensus is positive signed latitude
                sql = '''
                UPDATE lis_germplasm.grin_accession
                SET latitudeDecimal = latitudeDecimal * -1 
                WHERE latitudeDecimal < 0
                AND countryOfOrigin = %(country)s
                '''
            cur.execute(sql, params)
            conn.commit()
            print('updated latitudes for %s' % country)
        # update longitudes
        if cons['longitudeDecimal']['pos_count'] > 0 and cons['longitudeDecimal']['neg_count'] > 0:
            print(country)
            print(cons)

            # need to update in light of consensus
            if cons['longitudeDecimal']['pos_count'] == cons['longitudeDecimal']['neg_count']:
                print('****** warning-- no consensus! *******')
                continue

            neg_sign = (
                cons['longitudeDecimal']['pos_count'] < cons['longitudeDecimal']['neg_count'])
            if neg_sign:  # consensus is negative signed latitude
                sql = '''
                UPDATE lis_germplasm.grin_accession
                SET longitudeDecimal = longitudeDecimal * -1 
                WHERE longitudeDecimal > 0
                AND countryOfOrigin = %(country)s
                '''
            else:  # consensus is positive signed latitude
                sql = '''
                UPDATE lis_germplasm.grin_accession
                SET longitudeDecimal = longitudeDecimal * -1 
                WHERE longitudeDecimal < 0
                AND countryOfOrigin = %(country)s
                '''
            cur.execute(sql, params)
            conn.commit()
            print('updated longitudes for %s' % country)

    print('updating geographic_coord column...')
    sql = '''
    UPDATE lis_germplasm.grin_accession
    SET geographic_coord = ST_SetSRID(ST_MakePoint(longitudeDecimal, latitudeDecimal), 4326);
    '''
    cur.execute(sql)
    conn.commit()


def _dictfetchall(cursor):
    """Return all rows from a cursor as a dict"""
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
        ]


if __name__ == '__main__':
    main()
