app.service('geoJsonService',
function($http, $rootScope, $location, $timeout) {
  
  var DEFAULT_CENTER = { 'lat' : 35.87, 'lng' : -109.47 };
  var ALT_CENTER = { 'lat' : 0, 'lng' : 0 };
  var MAX_RECS = 200;
  var DEFAULT_ZOOM = 6;
  var MAX_INT = Math.pow(2, 53) - 1;
  
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
    if('accessionIds' in params) {
      if (! ('lng' in params)) {
	$location.search('lat', ALT_CENTER.lat);
	$location.search('lng', ALT_CENTER.lng);
      }
    }
    else {
      if (! ('lng' in params)) {
	$location.search('lat', DEFAULT_CENTER.lat);
	$location.search('lng', DEFAULT_CENTER.lng);
      }
    }
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
        country : params.country,
        accession_ids : params.accessionIds,
	trait_overlay : params.traitOverlay,
        limit: params.maxRecs,
      }
    }).then(
      function(resp) {
        // success handler;
        s.data = resp.data;
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
  
  s.initialBoundsUpdated = false;

  s.updateColors = function() {
    _.each(s.data, function(acc) {
      acc.properties.color = taxonChroma.get(acc.properties.taxon);
    });
  };
  
  s.updateBounds = function() {
    /* in case we are searching by accessionIds, we need to derive new
     * bounds before sending updated event to listeners
     * (e.g. mapController) Use Leafletjs to perform all the bounds
     * calculations and extent fitting. */

    var params = $location.search();
    if(! params.accessionIds) { return; }

    if(s.initialBoundsUpdated || s.data.length == 0) {
      return;
    }
    var anyGeolocatedAccession = _.find(s.data, function(geoJson) {
      if(_.has(geoJson, 'geometry.coordinates.length')) {
        return true;
      }
    });
    if( ! anyGeolocatedAccession) {
      return;
    }
    var point = L.latLng(anyGeolocatedAccession.geometry.coordinates[1],
                         anyGeolocatedAccession.geometry.coordinates[0]);
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
