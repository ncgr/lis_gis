app.service('geoJsonService', function($http, $rootScope) {

  var MAX_RECS = 200;
  var s = {}; // service/singleton we will return 
  s.updating = false;
  s.data = []; // an array of geoJson features
  s.map = null; // the leaflet map, assigned by mapController
  s.bounds = null;
  s.center = null;
  s.limitToMapExtent = true;
  s.limitToGeocoded = true;
  s.maxRecs = MAX_RECS;
  s.taxonQuery = null;
    
  // array of event names we are publishing  
  s.events = ['updated', 'willUpdate'];
  
  s.setBounds = function(bounds, search) {
    s.bounds = bounds;
    if(search) {
      s.search();
    }
  };
  
  s.setCenter = function(center, search) {
    s.map.panTo(center);
    s.bounds = s.map.getBounds();
    if(search) {
      s.search();
    }
  };

  s.setMaxRecs = function(max) {
    s.maxRecs = max;
    s.search();
  };

  s.setLimitToGeocoded = function(bool) {
    s.limitToGeocoded = bool;
    s.search();
  };
  
  s.setLimitToMapExtent = function(bool) {
    s.limitToMapExtent = bool;   
    s.search();
  };

  s.setTaxonQuery = function(q) {
    s.taxonQuery = q;
    s.search();
  };
  
  s.search = function() {
    s.updating = true;
    $http({
      url : 'search',
      method : 'GET',
      params : {
	q : s.taxonQuery,
  	ne_lat : s.bounds._northEast.lat,
  	ne_lng : s.bounds._northEast.lng,
  	sw_lat : s.bounds._southWest.lat,
  	sw_lng : s.bounds._southWest.lng,
	limit_geo_bounds : s.limitToMapExtent,
	limit_to_geocoded : s.limitToGeocoded,
	limit: s.maxRecs,
      }
    }).then(
      function(resp) {
  	// success handler;
  	s.data = resp.data;
	s.updating = false;
	s.notify('updated');
      },
      function(resp) {
  	// error handler
  	console.log('Error:');
  	console.log(resp);
      });
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
  };
  
  s.notify = function(eventName) {
    $rootScope.$emit('geoJsonService_'+eventName);
  };
  return s;
});
