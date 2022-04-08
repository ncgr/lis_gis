import gzip
import logging
import json
import subprocess

from lis_germplasm import settings
from unittest import TestCase
from django.test import Client

SCHEMA = 'scripts/schema.sql'
DATA = 'grin_app/tests/test_sql.txt'

# NOTE: assumes empty database dedicated for testing!
test_db = settings.DATABASES['default']

logger = logging.getLogger(__name__)

c = Client()

class TestViews(TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.check_call(['psql', '-f', SCHEMA])
        subprocess.check_call(['psql', '-f', DATA])
        subprocess.check_call('scripts/load.py', stdin=open('grin_app/tests/germplasm-mcpd.json'))
        subprocess.check_call('scripts/evaluation_metadata.py')

    @classmethod
    def tearDownClass(cls):
        subprocess.check_call(['psql', '-c', 'DROP SCHEMA lis_germplasm CASCADE'])

    def test_index(self):
        """Fetch the index.html and make sure the Django templating is working
        (see branding section of settings.py)
        """
        res = c.get('/')
        self.assertEqual(res.status_code, 200)
        assert len(res.content) > 0
        html = res.content
        assert b'<html' in html
        assert settings.BRANDING['site_abbrev'].encode() in html
        assert settings.BRANDING['site_heading'].encode() in html
        assert settings.BRANDING['home_url'].encode() in html
        assert settings.BRANDING['logo_url'].encode() in html
        assert settings.BRANDING['site_subheading'].encode() in html

    def test_search(self):
        query = '''
        {"taxon_query":"","ne_lat":38.92522904714054,"ne_lng":-97.2509765625,"sw_lat":32.694865977875075,"sw_lng":-121.6845703125,"limit_geo_bounds":false,"geocoded_only":false,"country":"","accession_ids_inclusive":false,"trait_overlay":"","limit":200}
        '''
        res = c.post('/search', 
                     content_type='application/json',
                     data=query)
        self.assertEqual(res.status_code, 200)
        assert len(res.content) > 0
        results = json.loads(res.content)
        assert len(results) > 0
        assert 'geometry' in results[0]
        # looks like geojson.
        pass


    def test_countries(self):
        res = c.get('/countries')
        self.assertEqual(res.status_code, 200)
        assert len(res.content) > 0
        results = json.loads(res.content)
        assert len(results) > 0
        pass


    def test_accession_detail(self):
        # this accession number exists in test.sql (or should)
        accession = 'Ames 22714'
        res = c.get('/accession_detail', {'accenumb': accession})
        self.assertEqual(res.status_code, 200)
        assert len(res.content) > 0
        results = json.loads(res.content)
        assert len(results) > 0
        assert results[0]['properties']['taxon'] == 'Medicago lupulina'
        pass


    def test_evaluation_descr_names(self):
        """it's OK if results is empty json, because the test.sql is
        necesarily incomplete, and the query involves a join between
        accessions and trait observations.
        """
        res = c.get('/evaluation_descr_names', {'taxon' : 'Arachis'})
        self.assertEqual(res.status_code, 200)
        assert len(res.content) > 0
        results = json.loads(res.content)
        pass


    def test_evaluation_detail(self):
        # this accession number comes from test.sql
        accession = 'Grif 12202'
        res = c.get('/evaluation_detail', {'accenumb' : accession })
        self.assertEqual(res.status_code, 200)
        assert len(res.content) > 0
        results = json.loads(res.content)
        assert 'Nigeria' == results[0]['origin']
        pass


    def test_evaluation_search(self):
        # this trait evaluation data comes from test.sql
        query = '''
        {"accession_ids":["Grif 12202", "Grif 12197"],"descriptor_name":"PODPLACE"}
        '''
        res = c.post('/evaluation_search', 
                     content_type='application/json',
                     data=query)
        self.assertEqual(res.status_code, 200)
        assert len(res.content) > 0
        results = json.loads(res.content)
        assert 'observation_value' in results[0]
        assert 'PODPLACE' == results[0]['descriptor_name']
        pass


    def test_evaluation_metadata(self):
        """this trait evaluation data comes from test.sql it's OK if results
        is empty json, because the test.sql is necesarily incomplete, and
        the query involves a join between accessions and trait
        observations.
        """
        query = '''
        {"taxon":"Vigna",
         "descriptor_name":"PODPLACE",
         "accession_ids":[],"trait_scale":"global"}
        '''
        res = c.post('/evaluation_metadata', 
                     content_type='application/json',
                     data=query)
        self.assertEqual(res.status_code, 200)
        pass


    def test_string2num(self):
        from grin_app.views import _string2num as _fn
        assert isinstance(_fn('3.14'), type(3.14))
        assert isinstance(_fn(10), type(10))
        assert isinstance(_fn('foo'), type('foo'))
        pass
