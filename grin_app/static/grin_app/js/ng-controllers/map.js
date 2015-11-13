/*
 * mapController
 */
"use strict";

app.controller('mapController',
function($scope, $state, $http, geoJsonService) {
		 
  var DEFAULT_POS = { 'lat' : 21.15, 'lng' : 80.42 };
  var DEFAULT_ZOOM = 6;
  var MIN_ZOOM = 3;
  var DEFAULT_BASEMAP = 'ESRI - NatGeo (default, reference map)';
  
  $scope.model = {
    map : null,  // the leaflet map
    geoJsonLayer : null,
    geoJsonService : geoJsonService,  // array of geoJson objects
    center : DEFAULT_POS,
    baseMapSelect : false,  // show basemap selector ui
    baseMapLayer : null,
    baseMaps : {
      'ESRI - NatGeo (default, reference map)' : function() {
	return L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
	  attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
	  maxZoom: 16
	});
      },
      'OpenTopoMap (terrain map)' : function() {
	return L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    	  maxZoom: 16,
    	  attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
	});
      },
      'MapQuest (aerial imagery)' : function() {
	return L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/{type}/{z}/{x}/{y}.{ext}', {
    	  type: 'sat',
    	  ext: 'jpg',
    	  attribution: 'Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> &mdash; Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency',
    	  subdomains: '1234'
	});
      }
    },
  };
 
  $scope.init = function() {
    
    $scope.model.map = L.map('map', {
      'center' : [$scope.model.center.lat, $scope.model.center.lng],
      'zoom' : DEFAULT_ZOOM,
      'minZoom' : MIN_ZOOM,
    });
    
    geoJsonService.map = $scope.model.map;
    geoJsonService.setCenter($scope.model.center, false);

    // add the default basemap
    $scope.model.baseMapLayer = $scope.model.baseMaps[DEFAULT_BASEMAP]();
    $scope.model.baseMapLayer.addTo($scope.model.map);
    
    $scope.model.geoJsonLayer = L.geoJson($scope.model.geoJsonService.data, {
      style: function (featureData) {
        return {color: '#eee'};
      },
      onEachFeature: function (featureData, layer) {
        layer.bindPopup(featureData.properties.taxon);
      },
      filter: filterNonGeocoded,
    });
    $scope.model.geoJsonLayer.addTo($scope.model.map);
    
    geoJsonService.subscribe($scope, 'updated', function() {
      $scope.model.geoJsonLayer.clearLayers();
      $scope.model.geoJsonLayer.addData(geoJsonService.data);
    });
    $scope.model.map.whenReady(function() {
      updateMarkersForBounds();
    });
    $scope.model.map.on('zoomend', function(e) {
      updateMarkersForBounds();
    });
    $scope.model.map.on('resize', function(e) {
      updateMarkersForBounds();
    });
    $scope.model.map.on('dragend', function(e) {
      updateMarkersForBounds();
    });
  };

  $scope.onSelectBaseMap = function(name) {
    var map = $scope.model.map;
    if(map.hasLayer($scope.model.baseMapLayer)) {
      map.removeLayer($scope.model.baseMapLayer);
    }
    var baseMap = $scope.model.baseMaps[name]();
    baseMap.addTo($scope.model.map);
    $scope.model.baseMapLayer = baseMap;
    $scope.model.baseMapSelect = false;
  };
  
  function panToMarkers() {
    /* use a centroid -ish algorithm to pan to the markers. this
     avoids a signed bounds calculation as well. */
    var avgLat = 0;
    var avgLng = 0;
    var count = 0;
    _.each(geoJsonService.data, function(d) {
      if(d.properties.latdec) {
	avgLat += d.properties.latdec;
	avgLng += d.properties.longdec;
	count += 1;
      }
    });
    avgLat /= count;
    avgLng /= count;
    var latlng = L.latLng(avgLat, avgLng);
    $scope.model.map.panTo(latlng);
  }

  function updateMarkersForBounds() {
    var map = $scope.model.map;
    var bounds = map.getBounds();
    geoJsonService.setBounds(bounds, true);
  }

  function filterNonGeocoded(featureData, layer) {
    /* GeoJson spec allows null coordinates (e.g. non-geocoded
     * accessions in our situation). However leafletjs errors on the
     * null coordinates, so filter them out here */
    return (featureData.geometry.coordinates !== null);
  }

  $scope.init();
  
});
