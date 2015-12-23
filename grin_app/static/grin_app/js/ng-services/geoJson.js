app.service('geoJsonService',
function($http, $rootScope, $location, $timeout) {
  
  var DEFAULT_CENTER = { 'lat' : 35.87, 'lng' : -109.47 };
  var MAX_RECS = 200;
  var DEFAULT_ZOOM = 6;
  
  var s = {}; // service/singleton we will construct & return
  
  s.updating = false;
  s.data = []; // an array of geoJson features
  s.map = null; // the leaflet map, Note: this belongs to
                // mapController! don't update within in this service.
  s.bounds = L.latLngBounds(L.latLng(0,0), L.latLng(0,0));
  
  // array of event names we are publishing
  s.events = ['updated', 'willUpdate'];
  
  s.init = function() {
    // set default search values on $location service
    var params = $location.search();
    if(! ('limitToMapExtent' in params) &&
       ! ('accessionIds' in params)) {
      $location.search('limitToMapExtent', true);
    }
    if(! ('zoom' in params)) {
      $location.search('zoom', DEFAULT_ZOOM);
    }
    if(! ('maxRecs' in params)) {
      $location.search('maxRecs', MAX_RECS);
    }
    if(! ('taxonQuery' in params)) {
      $location.search('taxonQuery', '');
    }
    if(! ('country' in params)) {
      $location.search('country', '');
    }
    if(! ('geocodedOnly' in params)) {
      $location.search('geocodedOnly', false);
    }
    if (! ('lng' in params)) {
      $location.search('lat', DEFAULT_CENTER.lat);
      $location.search('lng', DEFAULT_CENTER.lng);
    }
  };

  s.showAllNearbySameTaxon = function() {
    var acc = s.data[0];
    var taxon = acc.properties.taxon;
    s.setAccessionIds(null, false);
    s.setLimitToMapExtent(true, false);
    s.setTaxonQuery(taxon, false);
    s.map.setZoom(DEFAULT_ZOOM);
  };
  
  s.showAllNearby = function() {
    s.setAccessionIds(null, false);
    s.setLimitToMapExtent(true, false);
    s.setTaxonQuery(null, false);
    s.map.setZoom(DEFAULT_ZOOM);
  };
  
  s.getBoundsOfGeoJSONPoints = function() {
    var boundsArr = [];
    _.each(s.data, function(d) {
      if(d.geometry.coordinates)  {
        // convert from geojson simple coords to leafletjs simple coords
        boundsArr.push([d.geometry.coordinates[1],
                        d.geometry.coordinates[0]]);
      }
    });
    var bounds = new L.LatLngBounds(boundsArr);
    return bounds;
  };
  
  s.search = function() {
    $rootScope.errors = [];
    $rootScope.warnings = [];
    s.updating = true;
    var params = $location.search();
    
    $http({
      url : API_PATH + '/search',
      method : 'GET',
      params : {
        q : params.taxonQuery,
        ne_lat : s.bounds._northEast.lat,
        ne_lng : s.bounds._northEast.lng,
        sw_lat : s.bounds._southWest.lat,
        sw_lng : s.bounds._southWest.lng,
        limit_geo_bounds : params.limitToMapExtent,
	geocoded_only : params.geocodedOnly,
        country : params.country,
        accession_ids : params.accessionIds,
	trait_overlay : params.traitOverlay,
        limit: params.maxRecs,
      }
    }).then(
      function(resp) {
        // success handler;
        s.data = resp.data;

	if(s.data.length === 0 && params.geocodedOnly) {
	  // retry search with geocodedOnly off (to support edge case
	  // e.g. when searching by some countries which only have
	  // non-geographic accessions.)
	  params.geocodedOnly = false;
	  $timeout(s.search, 0);
	  return;
	}
	
	s.checkForGeocodedAccessionIds();
        s.updateBounds();
	s.updateColors();
        s.updating = false;
        s.notify('updated');
      },
      function(resp) {
        // error handler
        console.log('Error:');
        console.log(resp);
      });
  };

  s.checkForGeocodedAccessionIds = function() {
    var params = $location.search();
    var geocodedAcc = s.getAnyGeocodedAccession();
    if(! geocodedAcc) {
      if(params.accessionIds) {
	$rootScope.warnings = ['None of the requested accession ids (' +
	       params.accessionIds + ') have geographic \
               coordinates, so they will not appear on the map.'];
      }
      else if(params.country) {
	$rootScope.warnings = ['None of the matching accessions have \
          geographic coordinates, so they will not appear on the map.'];
      }
    }
  };
  
  s.setBounds = function(bounds, doSearch) {
    if(s.bounds.equals(bounds) && s.data.length > 0) {
      // early out if the bounds is already set to same, and we have results
      return;
    }
    s.bounds = bounds;
    $location.search('ne_lat', s.bounds._northEast.lat);
    $location.search('ne_lng', s.bounds._northEast.lng);
    $location.search('sw_lat', s.bounds._southWest.lat);
    $location.search('sw_lng', s.bounds._southWest.lng);
    if(doSearch) { s.search(); }
  };
  
  s.setCountry = function(cty, search) {
    $location.search('country', cty);
    if(search) { s.search(); }
  };
  
  s.setMaxRecs = function(max, search) {
    $location.search('maxRecs', max);
    if(search) { s.search(); }
  };
  
  s.setLimitToMapExtent = function(bool, search) {
    $location.search('limitToMapExtent', bool);
    if(search) { s.search(); }
  };

  s.setTaxonQuery = function(q, search) {
    $location.search('taxonQuery', q);
    if(search) { s.search(); }
  };

  s.setAccessionIds = function(accessionIds, search) {
    $location.search('accessionIds', accessionIds);
    s.initialBoundsUpdated = false;
    if(search) { s.search(); }
  };

  s.setTraitOverlay = function(trait, search) {
    $location.search('traitOverlay', trait);
    if(search) { s.search(); }
  };

  s.setGeocodedAccessionsOnly = function(bool, search) {
    $location.search('geocodedOnly', bool);
    if(search) { s.search(); }
  };
  
  s.updateColors = function() {
    _.each(s.data, function(acc) {
      acc.properties.color = taxonChroma.get(acc.properties.taxon);
    });
  };

  s.getAnyGeocodedAccession = function() {
    return _.find(s.data, function(geoJson) {
      if(_.has(geoJson, 'geometry.coordinates.length')) { return true; }
    });
  };

  s.initialBoundsUpdated = false;
  s.updateBounds = function() {
    /* in case we are searching by accessionIds, we need to derive new
     * bounds before sending updated event to listeners
     * (e.g. mapController) Use Leafletjs to perform all the bounds
     * calculations and extent fitting. */
    var params = $location.search();
    var accessionIds = _.get(params, 'accessionIds');
    if( ! accessionIds) { return; }
    if(s.initialBoundsUpdated || s.data.length == 0) { return; }
    var geocodedAcc = s.getAnyGeocodedAccession();
    if( ! geocodedAcc) { return; }
    var point = L.latLng(geocodedAcc.geometry.coordinates[1],
                         geocodedAcc.geometry.coordinates[0]);
    var bounds = L.latLngBounds(point, point);
    _.each(s.data, function(geoJson) {
      if(_.has(geoJson, 'geometry.coordinates.length')) {
        var point = L.latLng(geoJson.geometry.coordinates[1],
                             geoJson.geometry.coordinates[0]);  
        bounds.extend(point);
      }
    });
    s.bounds = bounds;
    s.initialBoundsUpdated = true;
  };
  
  /* pub/sub event model adapted from here :
     http://www.codelord.net/2015/05/04/angularjs-notifying-about-changes-from-services-to-controllers/
  */
  s.subscribe = function(scope, eventName, callback) {
    if(! _.contains(s.events, eventName)) {
      throw 'invalid eventName ' + eventName;
    }
    var handler = $rootScope.$on('geoJsonService_'+eventName, callback);
    scope.$on('$destroy', handler);
    return handler;
  };
  
  s.notify = function(eventName) {
    $rootScope.$emit('geoJsonService_'+eventName);
  };
  
  s.init();
    
  return s;
});
