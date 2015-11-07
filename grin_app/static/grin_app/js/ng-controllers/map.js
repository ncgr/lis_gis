/*
 * mapController
 */
"use strict";

app.controller('mapController',
function($scope, $state, $http, geoJsonService) {
		 
  var DEFAULT_CENTER = { 'lat' : 42, 'lng' : -100 };
  var DEFAULT_ZOOM = 6;
  var MIN_ZOOM = 3;
  
  $scope.model = {
    map : null,  // the leaflet map
    geoJsonLayer : null,
    geoJsonService : geoJsonService,  // array of geoJson objects
    center : DEFAULT_CENTER,
  };
  
  $scope.updateMarkersForBounds = function() {
    var map = $scope.model.map;
    // adjust the bounds for prime meridian and dateline
    // crossover. leaflet has a wrap() function for this
    var bounds = map.getBounds();
    geoJsonService.setBounds(bounds, true);
  };

  $scope.init = function() {
    /* initialize the default leaflet-js viewport. use a not-too-busy
       basemap, and center around the Iowa/Illinois area.  TODO: save
       initial bounds in a cookie instead of harcoding lat and lng. */
    $scope.model.map = L.map('map', {
      'center' : [ DEFAULT_CENTER.lat, DEFAULT_CENTER.lng ],
      'zoom' : DEFAULT_ZOOM,
      'minZoom' : MIN_ZOOM,
    });
    geoJsonService.map = $scope.model.map;
    geoJsonService.setCenter(DEFAULT_CENTER, false);
    L.tileLayer(
      'http://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png', {
	noWrap : true,
    	attribution: '&copy; <a href="http://www.opencyclemap.org">OpenCycleMap</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo($scope.model.map);
    $scope.model.geoJsonLayer = L.geoJson($scope.model.geoJsonService.data, {
      style: function (feature) {
        return {color: '#eee'};
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup(feature.properties.taxon);
      }
    });
    $scope.model.geoJsonLayer.addTo($scope.model.map);
    
    geoJsonService.subscribe($scope, 'updated', function() {
      $scope.model.geoJsonLayer.clearLayers();
      $scope.model.geoJsonLayer.addData(geoJsonService.data);
      // pan to new bounds if we have fts results out of map extent
      
      // TODO:  this breaks drag- and zoom interaction with the map
      //if(geoJsonService.taxonQuery && (! geoJsonService.limitToMapExtent)) {
      //$scope.panToMarkers();
    //}
      
    });
    $scope.model.map.whenReady(function() {
      $scope.updateMarkersForBounds();
    });
    $scope.model.map.on('zoomend', function(e) {
      $scope.updateMarkersForBounds();
    });
    $scope.model.map.on('resize', function(e) {
      $scope.updateMarkersForBounds();
    });
    $scope.model.map.on('dragend', function(e) {
      $scope.updateMarkersForBounds();
    });
  };

  $scope.panToMarkers = function() {
    /* use a centroid -ish algorithm to pan to the markers. this
     avoids a signed bounds calculation as well. */
    console.log('panToMarkers');
    var avgLat = 0;
    var avgLng = 0;
    var count = 0;
    _.each(geoJsonService.data, function(d) {
      console.log(d);
      if(d.properties.latdec) {
	avgLat += d.properties.latdec;
	avgLng += d.properties.longdec;
	count += 1;
      }
    });
    avgLat /= count;
    avgLng /= count;
    console.log(count);
    console.log(avgLat);
    console.log(avgLng);
    
    var latlng = L.latLng(avgLat, avgLng);
    $scope.model.map.panTo(latlng);
  };
  
  $scope.init();
  
});
