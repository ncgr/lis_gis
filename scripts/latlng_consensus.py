#!/usr/bin/env python

'''QA the data, update db wit a concensus for sign of latitude and
longitude values for each country. Some of the lat/long signs are
missing or wrong, locating the accessions in the wrong hemisphere.

'''
import psycopg2
import math

PSQL_DB = 'dbname=grin user=agr'
DATE_FMT = '%Y%m%d'
PNT_FMT = "ST_GeographyFromText('SRID=4326;POINT(%(longdec)s %(latdec)s)')"


if not hasattr(math, 'isclose'):
    # monkey patch for python2
    def isclose(a, b, rel_tol=1e-09, abs_tol=0.0):
        return abs(a-b) <= max(rel_tol * max(abs(a), abs(b)), abs_tol)
    math.isclose = isclose


def main():
    print('making lat/long consensus...')
    conn = psycopg2.connect(PSQL_DB)
    cur = conn.cursor()
    sql = '''SELECT distinct origcty 
    FROM lis_germplasm.grin_accession
    ORDER BY origcty
    '''
    cur.execute(sql)
    countries = [row[0] for row in cur.fetchall()]
    for country in countries:
        print(country)
        cons = {
            'latdec' : {
                'pos_count' : 0,
                'neg_count' : 0,
            },
            'longdec' :{
                'pos_count' : 0,
                'neg_count' : 0,
            },
        }
        sql = '''
        SELECT latdec, longdec, origcty
        FROM lis_germplasm.grin_accession 
        WHERE origcty = %(country)s
        '''
        params = {'country' : country}
        cur.execute(sql, params)
        recs = _dictfetchall(cur)
        for rec in recs:
            if not math.isclose(rec['longdec'], 0.0, abs_tol=0.00001):
                # have a nonzero longitude
                if rec['longdec'] > 0:
                    cons['longdec']['pos_count'] += 1
                elif rec['longdec'] < 0:
                    cons['longdec']['neg_count'] += 1
            if not math.isclose(rec['latdec'], 0.0, abs_tol=0.00001):
                # have a nonzero longitude
                if rec['latdec'] > 0:
                    cons['latdec']['pos_count'] += 1
                elif rec['latdec'] < 0:
                    cons['latdec']['neg_count'] += 1
        # update latitudes
        if cons['latdec']['pos_count'] > 0 and cons['latdec']['neg_count'] > 0:
            print(country)
            print(cons)
            # need to update in light of consensus
            if cons['latdec']['pos_count'] == cons['latdec']['neg_count']:
                print('****** warning-- no consensus! *******')
                continue

            neg_sign = (cons['latdec']['pos_count'] < cons['latdec']['neg_count'])
            if neg_sign: # consensus is negative signed latitude
                sql = '''
                UPDATE lis_germplasm.grin_accession
                SET latdec = latdec * -1 
                WHERE latdec > 0
                AND origcty = %(country)s
                '''
            else: # consensus is positive signed latitude
                sql = '''
                UPDATE lis_germplasm.grin_accession
                SET latdec = latdec * -1 
                WHERE latdec < 0
                AND origcty = %(country)s
                '''
            cur.execute(sql, params)
            conn.commit()
            print('updated latitudes for %s' % country)
        # update longitudes
        if cons['longdec']['pos_count'] > 0 and cons['longdec']['neg_count'] > 0:
            print(country)
            print(cons)

            # need to update in light of consensus
            if cons['longdec']['pos_count'] == cons['longdec']['neg_count']:
                print('****** warning-- no consensus! *******')
                continue

            neg_sign = (cons['longdec']['pos_count'] < cons['longdec']['neg_count'])
            if neg_sign: # consensus is negative signed latitude
                sql = '''
                UPDATE lis_germplasm.grin_accession
                SET longdec = longdec * -1 
                WHERE longdec > 0
                AND origcty = %(country)s
                '''
            else: # consensus is positive signed latitude
                sql = '''
                UPDATE lis_germplasm.grin_accession
                SET longdec = longdec * -1 
                WHERE longdec < 0
                AND origcty = %(country)s
                '''
            cur.execute(sql, params)
            conn.commit()
            print('updated longitudes for %s' % country)

    print('updating geographic_coord column...')
    sql = '''
    UPDATE lis_germplasm.grin_accession
    SET geographic_coord = ST_SetSRID(ST_MakePoint(longdec, latdec), 4326);
    '''
    cur.execute(sql)
    conn.commit()


def _dictfetchall(cursor):
    "Return all rows from a cursor as a dict"
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


if __name__ == '__main__':
    main()
