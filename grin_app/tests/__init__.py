"""
Create the database schema so view_tests.py can perform some actual
queries. This bypasses completely the Django ORM... because for the
most part the ORM was not used for this app.
"""

# import logging
import subprocess

from lis_germplasm import settings

SCHEMA = 'scripts/schema.sql'
DATA = 'grin_app/tests/test_sql.txt'

test_db = settings.DATABASES['default']


def setup():
    _create_postgis()
    _load_schema()
    _load_test_data()


def teardown():
    # Nose will drop the test db on it's own.
    pass


def _load_schema():
    schema_sql = open(SCHEMA).read()
    assert len(schema_sql) > 0
    args = [
        'psql',
        '-d', test_db['NAME'],
        '-U', test_db['USER'],
        '-f', SCHEMA
    ]
    subprocess.check_call(args)


def _load_test_data():
    data_sql = open(DATA).read()
    assert len(data_sql) > 0
    args = [
        'psql',
        '-d', test_db['NAME'],
        '-U', test_db['USER'],
        '-f', DATA
    ]
    subprocess.check_call(args)


def _create_postgis():
    for cmd in ('CREATE EXTENSION postgis',
                'CREATE EXTENSION postgis_topology',):
        args = [
            'psql',
            '-d', test_db['NAME'],
            '-U', test_db['USER'],
            '-c', cmd
        ]
        subprocess.check_call(args)
