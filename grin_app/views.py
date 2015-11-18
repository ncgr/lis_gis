import logging
import json
import math
from django.db import connection
from django.shortcuts import render
from django.http import HttpResponse
from django.http import HttpResponseNotFound
from django.http import HttpResponseServerError
from django.core.context_processors import csrf

SRID = 4326

ACCESSION_TAB = 'lis_germplasm.grin_accession'
SELECT_COLS = ('gid', 'taxon', 'latdec', 'longdec', 'accenumb', 'elevation',
               'cropname', 'collsite', 'colldate')
WHERE_FRAGS = {
    'q' : {
        'include' : lambda p: p.get('q', None),
        'sql' :  "taxon_fts @@ plainto_tsquery('english', %(q)s)",
    },
    'limit_geo_bounds' : {
        'include' : lambda p: p.get('limit_geo', None) == 'true' or not p.get('q', False),
        'sql' : '''ST_Contains(
           ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s),
           geographic_coord::geometry
           )''',
    },
}

ORDER_BY_FRAG = '''
 ORDER BY ST_Distance(
  geographic_coord::geometry,
  ST_Centroid(
   ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s)
  )
 ) ASC
'''
LIMIT_FRAG = 'LIMIT %(limit)s'

logger = logging.getLogger(__name__)

def index(req):
    '''Render the index template, which will boot up angular-js.
    '''
    return render(req, 'grin_app/index.html')


def search(req):
    '''Search by map bounds and return GeoJSON results.'''
    assert req.method == 'GET', 'GET request method required'
    params = req.GET
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
    
    if int(params['limit']) == 0:
        use_limit = ''
    else:
        use_limit = LIMIT_FRAG
        
    sql = '''SELECT %s FROM %s %s %s %s''' % (
        cols_sql,
        ACCESSION_TAB,
        where_sql,
        ORDER_BY_FRAG,
        use_limit,
    )
    logger.info(sql)
    cursor = connection.cursor()
    sql_params = {
        'q' : params.get('q', None),
        'minx' : float(params['sw_lng']),
        'miny' : float(params['sw_lat']),
        'maxx' : float(params['ne_lng']),
        'maxy' : float(params['ne_lat']),
        'limit': int(params['limit']),
        'srid' : SRID,
    }
    cursor.execute(sql, sql_params)
    rows = _dictfetchall(cursor)
    return _search_response(rows)
   

def _search_response(rows):
    geo_json = []
    # logger.info('results: %d' % len(rows))
    for rec in rows:
        # fix up properties which are not json serializable
        rec['colldate'] = str(rec['colldate'])
        # geojson can have null coords, so output this for
        # non-geocoded search results (e.g. full text search w/ limit
        # to current map extent turned off
        if rec['longdec'] == 0 and rec['latdec'] == 0:
            coords = None
        else:
            coords = [rec['longdec'], rec['latdec']]
        geo_json_frag = {
            'type' : 'Feature',
            'geometry' : {
                'type' : 'Point',
                'coordinates' : coords
            },
            'properties' : rec  # rec happens to be a dict of properties. yay
        }
        geo_json.append(geo_json_frag)
    resp = HttpResponse(json.dumps(geo_json),
                        content_type='application/json')
    return resp


def _dictfetchall(cursor):
    "Return all rows from a cursor as a dict"
    columns = [col[0] for col in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]
