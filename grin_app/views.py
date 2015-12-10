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
DEFAULT_LIMIT = 200
TWO_PLACES = Decimal('0.01')
ACCESSION_TAB = 'lis_germplasm.grin_accession'
SELECT_COLS = ('gid', 'taxon', 'latdec', 'longdec', 'accenumb', 'elevation',
               'cropname', 'collsite', 'acqdate', 'origcty')

ORDER_BY_FRAG = '''
 ORDER BY ST_Distance(
  geographic_coord::geometry,
  ST_Centroid(
   ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s)
  )
 ) ASC, taxon, gid
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
    'fts' : {
        'include' : lambda p: '|' in p.get('q', '') or '&' in p.get('q', ''),
        'sql' : "taxon_fts @@ to_tsquery('english', %(q)s)",
    },
    'fts_simple' : {
        'include' : lambda p: p.get('q', None) and not WHERE_FRAGS['fts']['include'](p),
        'sql' : "taxon_fts @@ plainto_tsquery('english', %(q)s)",
    },
    'country' : {
        'include' : lambda p: p.get('country', None),
        'sql' : 'origcty = %(country)s',
    },
    'accession_ids' : {
        'include' : lambda p: p.get('accession_ids', None),
        'sql' : 'accenumb = ANY( %(accession_ids)s )',
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


def accession_detail(req):
    '''Return all columns for this accesion record.'''
    assert req.method == 'GET', 'GET request method required'
    params = req.GET.dict()
    assert 'accenumb' in params, 'missing accenumb param'
    # fix me: name the columns dont select *
    sql= '''
    SELECT * FROM %s  WHERE accenumb = %s
     ''' % (ACCESSION_TAB, '%(accenumb)s')
    cursor = connection.cursor()
    logger.info(cursor.mogrify(sql, params))
    cursor.execute(sql, params)
    rows = _dictfetchall(cursor)
    return _search_response(rows)
    # columns = [col[0] for col in cursor.description]
    # rows = cursor.fetchall()
    # result = dict(zip(columns, rows))
    # result_json = json.dumps(result[0])
    # response = HttpResponse(result_json, content_type='application/json')
    # return response


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
                 if row[0] and COUNTRY_REGEX.match(row[0])]
    result = json.dumps(countries)
    response = HttpResponse(result, content_type='application/json')
    return response


def search(req):
    '''Search by map bounds and return GeoJSON results.'''
    assert req.method == 'GET', 'GET request method required'
    params = req.GET.dict()
    if 'limit' not in params:
        params['limit'] = DEFAULT_LIMIT
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
        'minx' : float(params.get('sw_lng', 0)),
        'miny' : float(params.get('sw_lat', 0)),
        'maxx' : float(params.get('ne_lng', 0)),
        'maxy' : float(params.get('ne_lat', 0)),
        'limit': int(params['limit']),
        'srid' : SRID,
    }
    if(params.get('accession_ids', None)):
        if ',' in params['accession_ids']:
            sql_params['accession_ids'] = params['accession_ids'].split(',')
        else:
            sql_params['accession_ids'] = [params['accession_ids']];
    logger.info(cursor.mogrify(sql, sql_params))
    cursor.execute(sql, sql_params)
    rows = _dictfetchall(cursor)
    return _search_response(rows)
   

def _search_response(rows):
    geo_json = []
    # logger.info('results: %d' % len(rows))
    for rec in rows:
        # fix up properties which are not json serializable
        if rec.get('acqdate', None):
            rec['acqdate'] = str(rec['acqdate'])
        else:
            rec['acqdate'] = None
        if rec.get('colldate', None):
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
