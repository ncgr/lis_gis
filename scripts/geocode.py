#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Use Google geocoding service
https://developers.google.com/maps/documentation/geocoding/intro
to locate germplasm accessions which are missing lat/lng coordinates.

Arachis accessions for example data:

PI 152146
PI 155107
PI 157542
PI 158854
PI 159786
PI 162655
PI 162857
PI 196622
PI 196635
PI 200441
PI 240560
PI 259617
PI 259658
PI 259836
PI 259851
PI 262038
PI 268586
PI 268696
PI 268755
PI 268806
PI 268868
PI 268996
PI 270786
PI 270905
PI 270907
PI 270998
PI 271019
PI 274193
PI 288146
PI 290536
PI 290560
PI 290566
PI 290594
PI 290620
PI 292950
PI 295250
PI 295309
PI 295730
PI 296550
PI 296558
PI 298854
PI 313129
PI 319768
PI 323268
PI 325943
PI 331297
PI 331314
PI 337293
PI 337399
PI 337406
PI 338338
PI 339960
PI 343384
PI 343398
PI 355268
PI 355271
PI 356004
PI 370331
PI 372271
PI 372305
PI 399581
PI 403813
PI 407667
PI 429420
PI 442768
PI 461434
PI 471952
PI 471954
PI 475863
PI 475918
PI 476025
PI 476636
PI 478819
PI 478850
PI 481795
PI 482120
PI 482189
PI 493329
PI 493356
PI 493547
PI 493581
PI 493631
PI 493693
PI 493717
PI 493729
PI 493880
PI 493938
PI 494795
PI 496401
PI 496448
PI 502040
PI 502111
PI 502120
PI 504614

"""
from urllib import urlencode
import requests
import psycopg2
import time
import argparse
import petl as etl
import pickle
from os.path import exists
import pycountry


REST_API = 'https://maps.googleapis.com/maps/api/geocode/json?%s'
REST_KEY = 'AIzaSyCYykwgCjwmnMpV-K8AiwsE7aCLXSydg6E'
REQ_PER_DAY = 2500  # free API limits
REQ_PER_SEC = 10.0
PSQL_DB = 'dbname=lis_gis user=agr'
CACHE_FILE = 'geocode-py-cache.p'

reqs = 0
conn = psycopg2.connect(PSQL_DB)
cur = conn.cursor()

# track which address formats had the most hits
stats = {
    'site': 0,
    'site_1st_part'
    'country': 0,
    'site+country': 0,
    'site_1st_part+country': 0,
}

api_cache = {}
if exists(CACHE_FILE):
    api_cache = pickle.load(open(CACHE_FILE, 'rb'))


def geocode(address):
    """
    :param address: an address or location string
    :return: list of result dictionaries, having geometry->location keys.
    """
    global api_cache
    global reqs

    if address in api_cache:
        print '** cache hit for %s ** ' % address
        return api_cache[address]

    query = urlencode([
        ('key', REST_KEY),
        ('address', address.encode('utf-8'))
    ], 'utf-8')


    url = REST_API % query
    r = requests.get(url)
    reqs += 1
    time.sleep(1 / REQ_PER_SEC)
    if r.status_code == 200:
        json = r.json()
        results = json['results']
        if len(results) > 0:
            print '** match for query: %s ** ' % address
            api_cache[address] = results
            pickle.dump(api_cache, open(CACHE_FILE, 'wb'))
            return results
    else:
        print r.status_code
        print r.json()
    return None


def get_accession_info(acc_id):
    """
    Lookup current coordinates, country and site for accession id
    :param acc_id: accession id
    :return: CurrentGeocodingStatus
    """
    sql = """
    select latdec, longdec, origcty, collsite from lis_germplasm.grin_accession
    where accenumb = %(acc_id)s
    """
    params = {'acc_id': acc_id}
    # print cur.mogrify(sql, params)
    try:
        cur.execute(sql, params)
        results = cur.fetchall()
        if len(results) > 0:
            rec = results[0]
            country_code = rec[2]
            if country_code:
                country = pycountry.countries.get(alpha3=country_code)
                country_name = country.name
                country_name = country_name.replace('Bolivia, Plurinational State of',
                                                    'Bolivia')
            else:
                country_name = country_code
            if rec[0] == 0 and rec[1] == 0:
                return CurrentGeocodingStatus(acc_id=acc_id,
                                              need_geo=True,
                                              country=country_name,
                                              site=rec[3])
            else:
                return CurrentGeocodingStatus(acc_id=acc_id,
                                              need_geo=False,
                                              curr_lat=round(rec[0], 2),
                                              curr_lng=round(rec[1], 2),
                                              country=country_name,
                                              site=rec[3])
        else:
            return None
    except psycopg2.Error as e:
        print(e)


def search_location(rec):
    """
    :param rec: CurrentGeocodingStatus record
    :return: updated CurrentGeocodingStatus record
    """
    queries = []
    if rec.country and rec.site:
        # try site+country
        queries.append('%s, %s' % (rec.site, rec.country))
        if '.' in rec.site:
            site_parts = rec.site.split('.')
            queries.append('%s, %s' % (site_parts[0].strip()), rec.country)
    if rec.site:
        queries.append(rec.site.strip())
        if '.' in rec.site:
            site_parts = rec.site.split('.')
            queries.append(site_parts[0].strip())
    if rec.country:
        queries.append(rec.country.strip())
    for q in queries:
        results = geocode(q)
        if results and len(results) > 0:
            result = results[0]
            rec.need_geo = False
            loc = result['geometry']['location']
            rec.curr_lat = round(loc['lat'], 2)
            rec.curr_lng = round(loc['lng'], 2)
            print '-> geocoded: ' + str(rec)
            return rec
    return rec


class CurrentGeocodingStatus():
    """
    Container for current geocoding status
    """
    def __init__(self,
                 acc_id,
                 need_geo=None,
                 curr_lat=None,
                 curr_lng=None,
                 country=None,
                 site=None):
        self.acc_id = acc_id
        self.need_geo = need_geo
        self.curr_lat = curr_lat
        self.curr_lng = curr_lng
        self.country = country
        self.site = site.replace('From','').replace('from','').strip()
        if need_geo is None and not curr_lat and not curr_lng:
            self.need_geo = True

    def __repr__(self):
        return '[{}] need_geo={} lat={} lng={} country={} site={}'.format(
            self.acc_id,
            self.need_geo,
            self.curr_lat,
            self.curr_lng,
            self.country.encode('utf-8'),
            self.site
        )


if __name__ == '__main__':

    unresolved = []
    parser = argparse.ArgumentParser(description='germplasm accession geocoder')
    parser.add_argument('--file')
    args = parser.parse_args()
    if not args.file:
        exit()

    tab = etl.fromtsv(args.file)

    result_tab = [('accession_id',
                   'latitude',  # new field
                   'longitude',  # new field
                   'taxon',
                   'trait_descriptor',
                   'trait_sub_descriptor',
                   'trait_observation_value')]

    for rec in tab[1:]:
        acc_id = rec[0]
        print acc_id
        lat = ''
        lng = ''
        gc_stat = get_accession_info(acc_id)
        if not gc_stat:
            print "** acc_id not found ** : " + acc_id
            result_tab.append((
                acc_id,
                lat,
                lng,
                rec[1],
                rec[2],
                rec[3],
                rec[4],
            ))
            continue
        if not gc_stat.need_geo:
            print "-> already have geo for accession: " + acc_id
            result_tab.append((
                acc_id,
                gc_stat.curr_lat,
                gc_stat.curr_lng,
                rec[1],
                rec[2],
                rec[3],
                rec[4],
            ))
            continue
        if not gc_stat.country and not gc_stat.site:
            print "-> no site or country code, skipping: " + acc_id
            result_tab.append((
                acc_id,
                lat,
                lng,
                rec[1],
                rec[2],
                rec[3],
                rec[4],
            ))
            continue
        gc_stat = search_location(gc_stat)
        if gc_stat.need_geo:
            unresolved.append(gc_stat)

        lat = gc_stat.curr_lat
        if lat == 0:
            lat = ''
        lng = gc_stat.curr_lng
        if lng == 0:
            lng = ''
        result_tab.append((
                acc_id,
                lat,
                lng,
                rec[1],
                rec[2],
                rec[3],
                rec[4],
            ))
    etl.tocsv(result_tab, 'geocoded.csv')
    print '*** unresolved %s ***' % len(unresolved)
    for r in unresolved:
        print r
