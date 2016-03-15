"use strict";

app.service('geoJsonService',
function($http, $rootScope, $location, $timeout, $q, $localStorage) {
  
  var that = this; /* http://javascript.crockford.com/private.html */

  /* constants */
  var DEFAULT_CENTER = { 'lat' : 35.87, 'lng' : -109.47 };
  var MAX_RECS = 200;
  var DEFAULT_ZOOM = 6;
  var MARKER_RADIUS = 8;

  /* private vars */
  var apiData = []; // array of geoJson features from the search api
  var userData = []; // array of geoJson features from the user
  var initialBoundsUpdated = false;

  /* public properties & functions... */
  
  this.updating = false;
  this.selectedAccession; // single accession object currently selected (if any)
  this.traitData = []; // an array of json with observation_values
  this.traitHash = {}; // lookup hash for accenumb to array of obthis. values
  this.traitMetadata = {};
  this.traitLegend = {}; // all the info for map.js to build a legend

  this.map = null; /* the leaflet map, Note: this belongs to
                    mapController! don't update the map within in this
                    service. */
  this.bounds = L.latLngBounds(L.latLng(0,0), L.latLng(0,0));
  
  // array of event names we are publishing
  this.events = ['updated', 'willUpdate', 'selectedAccessionUpdated'];
  
  this.init = function() {
    
    // set default search values on $location service
    that.params = that.getSearchParams();
  
    if(! ('zoom' in that.params)) {
      $location.search('zoom', DEFAULT_ZOOM);
    }
    if(! ('maxRecs' in that.params)) {
      $location.search('maxRecs', MAX_RECS);
    }
    if(! ('taxonQuery' in that.params)) {
      $location.search('taxonQuery', '');
    }
    if(! ('traitOverlay' in that.params)) {
      $location.search('traitOverlay', '');
    }
    if(! ('traitScale' in that.params)) {
      $location.search('traitScale', 'global');
    }
    if(! ('country' in that.params)) {
      $location.search('country', '');
    }
    if(! ('geocodedOnly' in that.params)) {
      $location.search('geocodedOnly', false);
    }
    if(! ('traitExcludeUnchar' in that.params)) {
      $location.search('traitExcludeUnchar', false);
    }
    if(! ('limitToMapExtent' in that.params) &&
       ! ('accessionIds' in that.params)) {
      $location.search('limitToMapExtent', true);
    }
    if (! ('lng' in that.params)) {
      $location.search('lat', DEFAULT_CENTER.lat);
      $location.search('lng', DEFAULT_CENTER.lng);
    }
    // store updated search params in property of service, for ease of
    // use by controllers and viewthat.
    that.params = that.getSearchParams();
  };

  /* getData() accessor for the geoJson data. if user data is present,
   * merge the 2 data sets and allow user data to override API
   * data. */
  this.getData = function() {
    // TODO implement userdata & merge
    return apiData;
  };
  
  this.showAllNearbySameTaxon = function() {
    var acc = apiData[0];
    var taxon = acc.properties.taxon;
    that.setAccessionIds(null, false);
    that.setLimitToMapExtent(true, false);
    that.setTaxonQuery(taxon, false);
    that.map.setZoom(DEFAULT_ZOOM);
  };
  
  this.showAllNearby = function() {
    that.setAccessionIds(null, false);
    that.setLimitToMapExtent(true, false);
    that.setTaxonQuery(null, false);
    that.map.setZoom(DEFAULT_ZOOM);
  };
  
  this.getBoundsOfGeoJSONPoints = function() {
    var boundsArr = [];
    _.each(that.getData(), function(d) {
      if(d.geometry.coordinates)  {
        // convert from geojson simple coords to leafletjs simple coords
        boundsArr.push([d.geometry.coordinates[1],
                        d.geometry.coordinates[0]]);
      }
    });
    var bounds = new L.LatLngBounds(boundsArr);
    return bounds;
  };

  function postProcessSearch() {
    that.params = that.getSearchParams();
    that.updateBounds();
    that.updateColors();
    that.updateMarkerStrategy();
    that.updating = false;
    that.setSelectedAccession(that.selectedAccession);
    that.notify('updated');
  }
  
  this.search = function() {
    $rootScope.errors = [];
    $rootScope.warnings = [];
    that.updating = true;
    apiData = [];
    that.traitData = [];
    that.traitHash = {};
    that.params = that.getSearchParams();
    
    $http({
      url : API_PATH + '/search',
      method : 'POST',
      data : {
        taxon_query : that.params.taxonQuery,
        ne_lat : that.bounds._northEast.lat,
        ne_lng : that.bounds._northEast.lng,
        sw_lat : that.bounds._southWest.lat,
        sw_lng : that.bounds._southWest.lng,
        limit_geo_bounds : parseBool(that.params.limitToMapExtent),
	geocoded_only : that.params.geocodedOnly,
        country : that.params.country,
        accession_ids : that.params.accessionIds,
	accession_ids_inclusive : parseBool(that.params.accessionIdsInclusive),
	trait_overlay : that.params.traitOverlay,
        limit: that.params.maxRecs,
      }
    }).then(
      function(resp) {
        // success handler;
        apiData = resp.data;
	if(apiData.length === 0 && that.params.geocodedOnly) {
	  /* retry search with geocodedOnly off (to support edge case
	     e.g. when searching by some countries which only have
	     non-geographic accessions. */
	  that.setGeocodedAccessionsOnly(false, true);
	  return;
	}
	if(that.params.taxonQuery && that.params.traitOverlay && apiData.length > 0) {
	  var promise1 = $http({
	    url : API_PATH + '/evaluation_search',
	    method : 'POST',
	    data : {
              accession_ids : that.getAccessionIds(),
	      descriptor_name : that.params.traitOverlay,
	    }
	  }).then(
	    function(resp) {
	      // success handler
	      that.traitData = resp.data;
	    },
	    function(resp) {
	      // error handler
	      console.log(resp);
	    }
	  );
	  var promise2 = $http({
	    url : API_PATH + '/evaluation_metadata',
	    method : 'POST',
	    data : {
              taxon : that.params.taxonQuery,
	      descriptor_name : that.params.traitOverlay,
	      accession_ids : that.params.traitScale === 'local' ? that.getAccessionIds() : [],
	      trait_scale : that.params.traitScale,
	    }
	  }).then(
	    function(resp) {
	      // success handler
	      that.traitMetadata = resp.data;
	    },
	    function(resp) {
	      // error handler
	      console.log(resp);
	    }
	  );
	  $q.all([promise1, promise2]).then(postProcessSearch);
	}
	else {
	  postProcessSearch();
	}
      },
      function(resp) {
        // error handler
        console.log('Error:');
        console.log(resp);
      });
  };

  /* return array an of accession ids in the current geojson data set. */
  this.getAccessionIds = function() {
    return _.map(that.getData(), function(d) {
      return d.properties.accenumb;
    });
  }

  /* return a shallow copy of $location.search() object, merging in
     properties for any local storage params, e.g. accessionIds which
     have overflowed the limit for URL param. */
  this.getSearchParams = function() {
    var params = $location.search();
    // url query string overrides anything in localStorage
    if(params.accessionIds) {
      delete $localStorage.accessionIds;
    }
    var merged = {};
    angular.extend(merged, params);
    if($localStorage.accessionIds) {
      merged.accessionIds = $localStorage.accessionIds;
    }
    // force some parameters to be booleans ($location.search() has
    // the unfortunate feature of being untyped; depending on how data
    // was set
    if('limitToMapExtent' in merged) {
      merged.limitToMapExtent = parseBool(merged.limitToMapExtent);
    }
    if('geocodedOnly' in merged) {
      merged.geocodedOnly = parseBool(merged.geocodedOnly);
    }
    if('traitExcludeUnchar' in merged) {
      merged.traitExcludeUnchar = parseBool(merged.traitExcludeUnchar);
    }
    if('zoom' in merged) {
      merged.zoom = parseInt(merged.zoom);
    }
    if('maxRecs' in merged) {
      merged.maxRecs = parseInt(merged.maxRecs);
    }    
    if('mapHeight' in merged) {
      merged.mapHeight = parseInt(merged.mapHeight);
    }    
    return merged;
  }

  /* set one selected accession to hilight in the UI */
  this.setSelectedAccession = function(accId) {
    var accession = _.find(apiData, function(d) {
      return (d.properties.accenumb === accId);
    });
    if( ! accession) {
      // the accession id is not in the current result set, so clear it.
      accId = null;
      changed = true;
    }
    else {
      // splice the record to beginning of geoJson dataset
      var idx = _.indexOf(apiData, accession);
      if(idx === -1) {
	return;
      }
      apiData.splice(idx, 1);
      apiData.splice(0, 0, accession);
    }
    var changed = (that.selectedAccession !== accId);
    that.selectedAccession = accId;
    if(changed) {
      that.notify('selectedAccessionUpdated');
    }
  }

  /* set the bounds of map extent, and save to search parameters */
  this.setBounds = function(bounds, doSearch) {
    if(that.bounds.equals(bounds) && that.getData().length > 0) {
      // early out if the bounds is already set to same, and we have results
      return;
    }
    that.bounds = bounds;
    $location.search('ne_lat', that.bounds._northEast.lat);
    $location.search('ne_lng', that.bounds._northEast.lng);
    $location.search('sw_lat', that.bounds._southWest.lat);
    $location.search('sw_lng', that.bounds._southWest.lng);
    if(doSearch) { that.search(); }
  };

  /* set a country filter for the search. */
  this.setCountry = function(cty, search) {
    $location.search('country', cty);
    if(search) { that.search(); }
  };

  /* set the max number of records in search results limit. */
  this.setMaxRecs = function(max, search) {
    $location.search('maxRecs', max);
    if(search) { that.search(); }
  };

  /* set whether to limit the search to the current geographic extent. */
  this.setLimitToMapExtent = function(bool, search) {
    $location.search('limitToMapExtent', bool);
    if(search) { that.search(); }
  };

  /* set a taxon query string for full-text search by genus or species. */
  this.setTaxonQuery = function(q, search) {
    $location.search('taxonQuery', q);
    if(search) { that.search(); }
  };

  /* set a list of specific accession ids */
  this.setAccessionIds = function(accessionIds, search) {
    // if there 'too many' accessionIds, it *will* overflow the
    // allowed URL length with search parameters, so use localstorage.
    delete $localStorage.accessionIds;
    $location.search('accessionIds', null);
    
    if(accessionIds) {
      var ids = accessionIds.split(',');
      if(ids.length <= 10) {
	// use url query parameter
	$location.search('accessionIds', accessionIds);
      }
      else {
	// use local storage api
	$localStorage.accessionIds = accessionIds;
      }
    }
    initialBoundsUpdated = false;
    if(search) { that.search(); }
  };

  /* set a custom color for the user's list of accessionIds */
  this.setAccessionIdsColor = function(color, search) {
    $location.search('accessionIdsColor', color);
    if(search) { that.search(); }
  };

  /* set whether to merge other search results in (true), or display 
     results exclusively for this set of accession ids. */
  this.setAccessionIdsInclusive = function(bool, search) {
    $location.search('accessionIdsInclusive', bool);
    if(search) { that.search(); }
  };

  /* set a trait descriptor_name to display for the taxon query. */
  this.setTraitOverlay = function(trait, search) {
    $location.search('traitOverlay', trait);
    if(search) { that.search(); }
  };

  /* set whether to exclude descriptor_name uncharacterized accessions 
     from the map display. */
  this.setTraitExcludeUnchar = function(bool, search) {
    $location.search('traitExcludeUnchar', bool);
    if(search) { that.search(); }
  };

  /* set either local or global trait scale, which effects display of 
     min/max values for numeric traits. */
  this.setTraitScale = function(scale, search) {
    $location.search('traitScale', scale);
    if(search) { that.search(); }
  };

  /* set whether to limit search results to those having geographic coords. */
  this.setGeocodedAccessionsOnly = function(bool, search) {
    $location.search('geocodedOnly', bool);
    if(search) { that.search(); }
  };

  /* use a custom color scheme with a range of the selected trait
     iterate the trait results once, to build a lookup table */
  function colorStrategyNumericTrait() {
    _.each(that.traitData, function(d) {
      if(that.traitHash[d.accenumb]) {
	that.traitHash[d.accenumb].push(d.observation_value);
      }
      else {
	that.traitHash[d.accenumb] = [d.observation_value];
      }
    });
    var min = that.traitMetadata.min;
    var max = that.traitMetadata.max;
    var scale = chroma.scale('Spectral').domain([max,min]);
    _.each(that.getData(), function(acc) {
      var accNum = acc.properties.accenumb;
      var traitValues = that.traitHash[acc.properties.accenumb];
      if(traitValues !== undefined) {
	// it is not unusual to have multiple observations, so just
	// average them-- possible there is a better way to handle this case
	var avg = _.sum(traitValues, function(d) {
	  return d;
	}) / traitValues.length;
	acc.properties.color = scale(avg).hex();
	acc.properties.haveTrait = true;	
      } else {
	acc.properties.color = taxonChroma.defaultColor;
      }
    });
    var steps = 10;
    var step = (max - min)/steps;
    var legendValues = _.map(_.range(min, max + step, step), function(n) {
      return  {
	label : n.toFixed(2),
	color : scale(n).hex(),
      }
    });
    that.traitLegend = {
      min : min,
      max : max,
      colorScale : scale,
      values : legendValues,
    };
  }

  function colorStrategyCategoryTrait() {

    _.each(that.traitData, function(d) {
      if(that.traitHash[d.accenumb]) {
	that.traitHash[d.accenumb].push(d.observation_value);
      }
      else {
	that.traitHash[d.accenumb] = [d.observation_value];
      }
    });
    
    _.each(that.getData(), function(d) {
      var accNum = d.properties.accenumb;
      var traitValues = that.traitHash[d.properties.accenumb];
      if(traitValues !== undefined) {
	// unsure how to handle case where multiple categories were
	// observed, so just take the 1st
	var val = traitValues[0];
	d.properties.color = that.traitMetadata.colors[val];
	d.properties.haveTrait = true;
      }
      else {
	d.properties.color = taxonChroma.defaultColor;
      }
    });

    var legendValues = _.map(that.traitMetadata.obs_nominal_values,
	function(n) {
	  return  {
	    label : n,
	    color : that.traitMetadata.colors[n],
	  }
	});
    that.traitLegend = { 
      min : null,
      max : null,
      colorScale : null,
      values : legendValues,
    };
  }

  this.updateColors = function() {
    that.traitHash = {};
    that.traitLegend = {};

    if(that.params.traitOverlay) {
      if(that.traitMetadata.trait_type === 'numeric') {
	colorStrategyNumericTrait();
      }
      else {
	colorStrategyCategoryTrait();
      }
    }
    else {
      // use default color scheme from taxonChroma
      _.each(that.getData(), function(acc) {
	acc.properties.color = taxonChroma.get(acc.properties.taxon);
      });
    }

    // override all over coloring schems, with accessionIds coloring, if any
    if(that.params.accessionIds && that.params.accessionIdsColor) {
      var accIds = that.params.accessionIds.split(',');
      _.each(that.getData(), function(acc) {
	if(accIds.indexOf(acc.properties.accenumb) !== -1) {
	  acc.properties.color = that.params.accessionIdsColor;
	}
      });
    }
  };

  /*
   * updateMarkerStrategy() Use Leaflet's circleMarker by default. If we
   * are displaying categorical trait data, then draw a pie-chart
   * marker with all the nominal values.
   */
  this.updateMarkerStrategy = function() {
    if(that.params.traitOverlay &&
       that.traitMetadata.trait_type === 'nominal') {
      that.markerCallback = getPieChartMarker;
    }
    else {
      that.markerCallback = getCircleMarker;
    }
  };

  function getCircleMarker(feature, latlng) {
    // get a circle marker and tag it with the accession #.
    var mouseOverLabel = feature.properties.accenumb +
	' (' + feature.properties.taxon + ')';
    var marker = L.circleMarker(latlng, {
      id : feature.accenumb,
      radius: MARKER_RADIUS,
      fillColor: feature.properties.color,
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 1,
    });
    marker.bindLabel(mouseOverLabel);
    return marker;
  }

  function getPieChartMarker(feature, latlng) {
    // get a circle marker colored as pie chart, with all of
    var mouseOverLabel = feature.properties.accenumb +
	' (' + feature.properties.taxon + ')';
    var data = that.traitHash[feature.properties.accenumb];
    if(! data) {
      // this accession is uncharacterized, so fall back to circle marker
      return getCircleMarker(feature, latlng);
    }
    // construct data dictionary and chartOptions for leaflet-dvf piechart
    data = _.uniq(data);
    var dataDict = _.keyBy(data, function(d) { return d; });
    var degreesPerCategory = 360 / data.length;
    dataDict = _.mapValues(dataDict, function(d) { return degreesPerCategory;});
    var chartOptionsDict = _.keyBy(data, function(d) { return d; });
    chartOptionsDict = _.mapValues(chartOptionsDict, function(d) {
      return {
	fillColor : that.traitMetadata.colors[d],
	displayText : function(value) {
	  return feature.properties.accenumb;
	},
      }
    });
    var options = {
      data: dataDict,
      chartOptions: chartOptionsDict,
      radius : MARKER_RADIUS,
      opacity : 1.0,
      fillOpacity : 1.0,
      gradient : false,
    };
    var marker = new L.PieChartMarker(latlng, options);
    return marker;
  }
  
  this.getAnyGeocodedAccession = function() {
    return _.find(that.getData(), function(geoJson) {
      if(_.has(geoJson, 'geometry.coordinates.length')) { return true; }
    });
  };

  
  this.updateBounds = function() {
    /* in case we are searching by accessionIds, we need to derive new
     * bounds before sending updated event to listeners
     * (e.g. mapController) Use Leafletjs to perform all the bounds
     * calculations and extent fitting. */
    var accessionIds = _.get(that.params, 'accessionIds');
    if( ! accessionIds) { return; }
    if(initialBoundsUpdated || that.getData().length == 0) { return; }
    var geocodedAcc = that.getAnyGeocodedAccession();
    if( ! geocodedAcc) { return; }
    var point = L.latLng(geocodedAcc.geometry.coordinates[1],
                         geocodedAcc.geometry.coordinates[0]);
    var bounds = L.latLngBounds(point, point);
    _.each(that.getData(), function(geoJson) {
      if(_.has(geoJson, 'geometry.coordinates.length')) {
        var point = L.latLng(geoJson.geometry.coordinates[1],
                             geoJson.geometry.coordinates[0]);  
        bounds.extend(point);
      }
    });
    that.bounds = bounds;
    initialBoundsUpdated = true;
  };
  
  /* pub/sub event model adapted from here :
     http://www.codelord.net/2015/05/04/angularjs-notifying-about-changes-from-services-to-controllers/
  */
  this.subscribe = function(scope, eventName, callback) {
    if(! _.includes(that.events, eventName)) {
      throw 'invalid eventName ' + eventName;
    }
    var handler = $rootScope.$on('geoJsonService_'+eventName, callback);
    scope.$on('$destroy', handler);
    return handler;
  };
  
  this.notify = function(eventName) {
    $rootScope.$emit('geoJsonService_'+eventName);
  };
  
  this.init();

});
