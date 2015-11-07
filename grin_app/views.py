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
    if params.get('q'):
        return _search_fts(params)
    return _search_geo_only(params)
   

def _search_fts(params):
    '''Full text search on taxon, optionally including map bounds and
    other params.'''
    assert 'q' in params, 'missing q param'
    if params.get('limit_geo_bounds') == 'true':  # this is a string not Bool.
        return _search_fts_geo_bounds(params)
    else:
        return _search_fts_no_geo_bounds(params)
    

def _search_fts_no_geo_bounds(params):
    '''Full text search, with no topology check on current map bounds. The
    bounds are used for sorting the results.'''
    logger.info('_search_fts_no_geo_bounds')
    sql = '''
    SELECT gid, taxon, genus, species, latdec, longdec, accenumb, elevation,
           cropname, collsite, colldate, collsrc
    FROM genus
    WHERE taxon_fts @@ plainto_tsquery('english', %(q)s)
    [geocoding-clause]
    ORDER BY ST_Distance(
        geographic_coord::geometry,
        ST_Centroid(
         ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s)
        )
    ) ASC
    LIMIT %(limit)s
    '''
    if params.get('limit_to_geocoded') == 'true':
        sql = sql.replace('[geocoding-clause]',
                          'AND geographic_coord IS NOT NULL', 1)
    else:
        sql = sql.replace('[geocoding-clause]','', 1)
    cursor = connection.cursor()
    sql_params = {
        'q' : params['q'],
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


def _search_fts_geo_bounds(params):
    '''Full text search, within the current geographic bounds.'''
    logger.info('_search_fts_geo_bounds')
    sql = '''
    SELECT gid, taxon, genus, species, latdec, longdec, accenumb, elevation,
           cropname, collsite, colldate, collsrc
    FROM genus
    WHERE taxon_fts @@ plainto_tsquery('english', %(q)s)
    AND geographic_coord IS NOT NULL
    AND ST_Contains(
      ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s),
      geographic_coord::geometry
    )
    ORDER BY ST_Distance(
        geographic_coord::geometry,
        ST_Centroid(
         ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s)
        )
    ) ASC
    LIMIT %(limit)s
    '''
    cursor = connection.cursor()
    sql_params = {
        'q' : params['q'],
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


def _search_geo_only(params):
    '''Search by map bounds only'''
    logger.info('_search_geo_only')
    assert 'ne_lat' in params, 'missing ne_lat param'
    assert 'ne_lng' in params, 'missing ne_lng param'
    assert 'sw_lat' in params, 'missing sw_lat param'
    assert 'sw_lng' in params, 'missing sw_lng param'
    assert 'limit' in params, 'missing limit param'
    sql = '''
    SELECT gid, taxon, genus, species, latdec, longdec, accenumb, elevation,
           cropname, collsite, colldate, collsrc
    FROM genus
    WHERE geographic_coord IS NOT NULL
    AND ST_Contains(
      ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s),
      geographic_coord::geometry
    )
    ORDER BY ST_Distance(
        geographic_coord::geometry,
        ST_Centroid(
         ST_MakeEnvelope(%(minx)s, %(miny)s, %(maxx)s, %(maxy)s, %(srid)s)
        )
    ) ASC
    LIMIT %(limit)s
    '''
    cursor = connection.cursor()
    sql_params = {
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
        geo_json.append({
            'type' : 'Feature',
            'geometry' : {
                'type' : 'Point',
                'coordinates' : [rec['longdec'], rec['latdec']],
            },
            'properties' : rec  # rec happens to be a dict of properties. yay
        })
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
