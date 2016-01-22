#!/usr/bin/env python

import psycopg2

PSQL_DB = 'dbname=drupal user=www'


def main():
    conn = psycopg2.connect(PSQL_DB)
    cur = conn.cursor()
    sql = '''
    select distinct descriptor_name
    from lis_germplasm.legumes_grin_evaluation_data
    '''
    cur.execute(sql)
    descriptor_names = [row[0] for row in cur.fetchall()]
    for name in descriptor_names:
        sql = '''
        select distinct observation_value 
        from lis_germplasm.legumes_grin_evaluation_data
        where descriptor_name = %(name)s
        '''
        cur.execute(sql, {'name' : name})
        values = [row[0] for row in cur.fetchall()]
        print name, "\t", values


if __name__ == '__main__':
    main()
