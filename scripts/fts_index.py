#!/usr/bin/env python3

"""
Update the FTS index for the taxon field. Should be done after all
genera are loaded/updated.
"""

import psycopg2

def main():
    print('updating full text search index...')
    conn = psycopg2.connect()
    cur = conn.cursor()
    sql = '''UPDATE lis_germplasm.grin_accession
             SET taxon_fts = to_tsvector('english', coalesce(taxon,'')) '''
    cur.execute(sql)
    conn.commit()


if __name__ == '__main__':
    main()
