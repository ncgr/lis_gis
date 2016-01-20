#!/usr/bin/env python

'''
Update the evaluation metadata in
lis_germplasm.grin_evaluation_metadata. Should be done after all
genera evaluation data are loaded/updated.
'''
import psycopg2

PSQL_DB = 'dbname=grin user=agr'
NOMINAL_THRESHOLD = 10

conn = psycopg2.connect(PSQL_DB)

def main():
    cur = conn.cursor()
    print('deleting evaluation metadata...')
    cur.execute('DELETE FROM lis_germplasm.grin_evaluation_metadata')
    print('updating evaluation metadata...')
    sql = '''
    SELECT DISTINCT taxon, descriptor_name
    FROM lis_germplasm.legumes_grin_evaluation_data
    WHERE taxon IS NOT NULL AND descriptor_name IS NOT NULL
    '''
    cur.execute(sql)
    rows = cur.fetchall()
    for taxon, descriptor_name in rows:
        sql = '''
        SELECT DISTINCT observation_value
        FROM lis_germplasm.legumes_grin_evaluation_data
        WHERE descriptor_name = %(q)s
        AND observation_value IS NOT NULL
        '''
        cur.execute(sql, {'q' : descriptor_name})
        obs_values = [ _string2num(row[0]) for row in cur.fetchall() ]
        if _detect_numeric_trait(obs_values):
            handler = _update_numeric_trait_metadata
        else:
            handler = _update_nominal_trait_metadata
        handler(taxon=taxon,
                descriptor_name=descriptor_name,
                obs_values=obs_values)
    print('committing...')
    conn.commit()


def _update_numeric_trait_metadata(**params):
    '''
    Update the metadata for this numeric trait.
    '''
    sql = '''
    INSERT INTO lis_germplasm.grin_evaluation_metadata
      (taxon, descriptor_name, obs_type, obs_min, obs_max)
    VALUES
      (%(taxon)s, %(descriptor_name)s, 'numeric', %(min)s, %(max)s)
    '''
    params['min'] = min(params['obs_values'])
    params['max'] = max(params['obs_values'])
    cur = conn.cursor()
    # print cur.mogrify(sql, params)
    cur.execute(sql, params)


def _update_nominal_trait_metadata(**params):
    '''
    Update the metadata for this nominal trait.
    '''
    sql = '''
    INSERT INTO lis_germplasm.grin_evaluation_metadata
      (taxon, descriptor_name, obs_type, obs_nominal_values)
    VALUES
      (%(taxon)s, %(descriptor_name)s, 'nominal', %(nominal_values)s)
    '''
    params['nominal_values'] = sorted([str(x) for x in params['obs_values']])
    cur = conn.cursor()
    # print cur.mogrify(sql, params)
    cur.execute(sql, params)


def _string2num(s):
    '''
    Convert a string to int or float, if possible.
    '''
    intval = None
    floatval = None
    try:
        intval = int(s)
        return intval
    except ValueError:
        pass
    try:
        floatval = float(s)
        return floatval
    except ValueError:
        pass
    return s


def _detect_numeric_trait(rows):
    '''
    1. If there are any strings, assume this must not be a numeric trait.
    2. If there are only ints within a narrow range, then assume it's a
       category trait using ints as classes.
    3. Otherwise by default it must be numeric.
    '''
    strings = [ val for val in rows if isinstance(val, basestring) ]
    if len(strings) > 0:
        return False  # have at least one string, must not be numeric.
    ints = [ val for val in rows if isinstance(val, int) ]
    if len(ints) == len(rows):
        uniq = sorted(list(set(ints)))
        if len(uniq) <= NOMINAL_THRESHOLD:
            # this trait's observations are a small number of ints, so
            # (perhaps) that some evidence maybe this is a category not a
            # measurement.
            return False
    return True


if __name__ == '__main__':
    main()

