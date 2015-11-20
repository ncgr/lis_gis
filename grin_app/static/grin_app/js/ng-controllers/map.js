/*
 * mapController
 */
"use strict";

app.controller('mapController',
function($scope, $state, $timeout, geoJsonService) {
		 
  var DEFAULT_POS = { 'lat' : 21.15, 'lng' : 80.42 };
  var DEFAULT_ZOOM = 6;
  var MIN_ZOOM = 3;
  var DEFAULT_BASEMAP = 'ESRI - NatGeo (default, reference map)';
  
  $scope.model = {
    geoJson : geoJsonService,
    map : null,  // the leaflet map
    geoJsonLayer : null,
    geoJsonService : geoJsonService,  // array of geoJson objects
    center : DEFAULT_POS,
    geoCoordsSelect : false, // show geocoords selector ui
    baseMapSelect : false,   // show basemap selector ui
    baseMapLayer : null,
    maxResultsCircle : null,
    countries : [],
    baseMaps : {
      'ESRI - NatGeo (default, reference map)' : function() {
	return L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
	  attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
	  maxZoom: 16,
	  noWrap: true,
	});
      },
      'OpenTopoMap (terrain map)' : function() {
	return L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    	  maxZoom: 16,
    	  attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
	  noWrap: true,
	});
      },
      'MapQuest (aerial imagery)' : function() {
	return L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/{type}/{z}/{x}/{y}.{ext}', {
    	  type: 'sat',
    	  ext: 'jpg',
    	  attribution: 'Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> &mdash; Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency',
    	  subdomains: '1234',
	  noWrap: true,
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
      pointToLayer: function (feature, latlng) {
	// create circle marker and tag it with the accession #.
        return L.circleMarker(latlng, {
	  id : feature.accenumb,
	  radius: 8,
	  fillColor: geoJsonService.colorFeature(feature),
	  color: "#000",
	  weight: 1,
	  opacity: 1,
	  fillOpacity: 0.8
	});
      },
      onEachFeature: function (feature, layer) {
	// bind a popup to each 
	var content = feature.properties.accenumb +
	    '<br/>' + feature.properties.taxon;
	var popup = L.popup();
	popup.setContent(content);
        layer.bindPopup(popup);
      },
      filter: filterNonGeocoded,
    });
    $scope.model.geoJsonLayer.addTo($scope.model.map);
    
    geoJsonService.subscribe($scope, 'updated', function() {
      var center = geoJsonService.map.getCenter();
      $scope.model.center = {
	lat: center.lat.toFixed(2),
	lng: center.lng.toFixed(2),
      };
      $scope.model.geoJsonLayer.clearLayers();
      $scope.model.geoJsonLayer.addData($scope.model.geoJsonService.data);
      $timeout(addMaxResultsSymbology, 0);
      $timeout(fixMarkerZOrder, 0);
    });
    
    $scope.model.map.whenReady(function() {
      $timeout(updateSearchForBounds, 0);
    });
    $scope.model.map.on('moveend', function(e) {
      // moveend fires at the end of drag and zoom events as well.
      // don't subscribe to those events because it was causing
      // multiple queries to be issued for same extent.
      $timeout(updateSearchForBounds, 0);
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
  
  $scope.onSetCenter = function() {
    // user updated lat/long form values
    geoJsonService.setCenter($scope.model.center, true);
    $scope.model.geoCoordsSelect = false;
  };
  
  $scope.onGeoLocate = function() {
    // user hit go to my location button
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
	$scope.model.center = {
	  lat : position.coords.latitude,
	  lng : position.coords.longitude,
	};
	geoJsonService.setCenter($scope.model.center, true);
      });
    }
    $scope.model.geoCoordsSelect = false;
    $scope.model.baseMapSelect = false;
  };

  $scope.onTour = function() {
    app.tour();
  };

  function fixMarkerZOrder() {
    // workaround for leaflet not having correct z ordering for
    // the layers as added
    $scope.model.map.eachLayer(function(l) {
      if(_.has(l, 'feature.properties')) {
	l.bringToBack();
      }
    });
  }
  
  function addMaxResultsSymbology() {
    if($scope.maxResultsCircle) {
      geoJsonService.map.removeLayer($scope.maxResultsCircle);
    }
    if(geoJsonService.data.length !== geoJsonService.maxRecs) {
      return;
    }
    var bounds = geoJsonService.getBoundsOfGeoJSONPoints();
    if($scope.maxResultsCircle) {
      geoJsonService.map.removeLayer($scope.maxResultsCircle);
    }
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    var meters = sw.distanceTo(ne) * 0.5;
    $scope.maxResultsCircle = L.circle(bounds.getCenter(),meters, {
      color: 'rgb(245, 231, 158)',
      fill: false,
      opacity: 0.75,
    }).addTo(geoJsonService.map);
  }

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
  
  function updateSearchForBounds() {
    /* request geojson service to update search results for new bounds */
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
