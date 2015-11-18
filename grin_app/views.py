import logging
import simplejson as json
import decimal
import re
from decimal import Decimal
from django.db import connection
from django.shortcuts import render
from django.http import HttpResponse
from django.http import HttpResponseNotFound
from django.http import HttpResponseServerError
from django.core.context_processors import csrf
from django.core.serializers.json import DjangoJSONEncoder

SRID = 4326  # this needs to match the SRID on the location field in psql.
TWO_PLACES = Decimal('0.01')
ACCESSION_TAB = 'lis_germplasm.grin_accession'
SELECT_COLS = ('gid', 'taxon', 'latdec', 'longdec', 'accenumb', 'elevation',
               'cropname', 'collsite', 'colldate', 'origcty')

ORDER_BY_FRAG = '''
 ORDER BY ST_Distance(
  geographic_coord::geometry,
  ST_Centroid(
   ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s)
  )
 ) ASC
'''
LIMIT_FRAG = 'LIMIT %(limit)s'
COUNTRY_REGEX = re.compile(r'[a-z]{3,3}', re.I)

logger = logging.getLogger(__name__)


def _include_geo_bounds(p):
    if p.get('q', None):
        if p.get('limit_geo_bounds', None) == 'true':
            return True
        else:
            return False
    if p.get('country', None):
        return False
    return True

WHERE_FRAGS = {
    'q' : {
        'include' : lambda p: p.get('q', None),
        'sql' :  "taxon_fts @@ plainto_tsquery('english', %(q)s)",
    },
    'country' : {
        'include' : lambda p: p.get('country', None),
        'sql' :  'origcty = %(country)s',
    },
    'limit_geo_bounds' : {
        'include' :  lambda p: p.get('limit_geo_bounds', None) == 'true',
        'sql' : '''ST_Contains(
           ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s),
           geographic_coord::geometry
           )''',
    },
}

def index(req):
    '''Render the index template, which will boot up angular-js.
    '''
    return render(req, 'grin_app/index.html')

def countries(req):
    '''Return a json array of countries for search filtering ui.'''
    cursor = connection.cursor()
    sql = '''
    SELECT DISTINCT origcty
    FROM lis_germplasm.grin_accession 
    ORDER by origcty
    '''
    cursor.execute(sql)
    # flatten into array, and filter out bogus records like '' or
    # 3 number codes.
    countries = [row[0] for row in cursor.fetchall()
                 if COUNTRY_REGEX.match(row[0])]
    result = json.dumps(countries)
    response = HttpResponse(result, content_type='application/json')
    return response


def search(req):
    '''Search by map bounds and return GeoJSON results.'''
    assert req.method == 'GET', 'GET request method required'
    params = req.GET.dict()
    assert 'limit' in params, 'missing limit param'
    where_clauses = []
    for key, val in WHERE_FRAGS.items():
        if val['include'](params):
            where_clauses.append(val['sql'])
    if len(where_clauses) == 0:
        where_sql = ''
    else:
        where_sql = 'WHERE %s' % ' AND '.join(where_clauses)
    cols_sql = ' , '.join(SELECT_COLS)
    
    params['limit'] = int(params['limit'])
    if int(params['limit']) == 0:
        params['limit'] = 'ALL'  # LIMIT ALL -- no limit
        
    sql = '''SELECT %s FROM %s %s %s %s''' % (
        cols_sql,
        ACCESSION_TAB,
        where_sql,
        ORDER_BY_FRAG,
        LIMIT_FRAG,
    )
    cursor = connection.cursor()
    sql_params = {
        'q' : params.get('q', None),
        'country' : params.get('country', None),
        'minx' : float(params['sw_lng']),
        'miny' : float(params['sw_lat']),
        'maxx' : float(params['ne_lng']),
        'maxy' : float(params['ne_lat']),
        'limit': int(params['limit']),
        'srid' : SRID,
    }
    logger.info(cursor.mogrify(sql, sql_params))
    cursor.execute(sql, sql_params)
    rows = _dictfetchall(cursor)
    return _search_response(rows)
   

def _search_response(rows):
    geo_json = []
    # logger.info('results: %d' % len(rows))
    for rec in rows:
        # fix up properties which are not json serializable
        if rec['colldate']:
            rec['colldate'] = str(rec['colldate'])
        else:
            rec['colldate'] = None
        # geojson can have null coords, so output this for
        # non-geocoded search results (e.g. full text search w/ limit
        # to current map extent turned off
        if rec['longdec'] == 0 and rec['latdec'] == 0:
            coords = None
        else:
            lat = Decimal(rec['latdec']).quantize(TWO_PLACES)
            lng = Decimal(rec['longdec']).quantize(TWO_PLACES)
            coords = [lng, lat]
        del rec['latdec']  # have been translated into geojson coords, 
        del rec['longdec'] # so these keys are extraneous now.
        geo_json_frag = {
            'type' : 'Feature',
            'geometry' : {
                'type' : 'Point',
                'coordinates' : coords
            },
            'properties' : rec  # rec happens to be a dict of properties. yay
        }
        geo_json.append(geo_json_frag)
    result = json.dumps(geo_json, use_decimal=True)
    response = HttpResponse(result, content_type='application/json')
    return response


def _dictfetchall(cursor):
    "Return all rows from a cursor as a dict"
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]
