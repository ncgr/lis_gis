/*
 * mapController
 */
"use strict";

app.controller('mapController',
function($scope, $state, $timeout, $location, geoJsonService) {
  
  var DEFAULT_BASEMAP = $location.search().baseMap ||
                        Cookies.get('baseMap') ||
                        'ESRI - NatGeo (default, reference map)';

  /* note: this is the default height used by leafletjs. if another
   * default size is set, it will result in the map size being
   * invlidated and causing an initieal reload of the search (which we
   * dont want to happen )*/
  var DEFAULT_MAP_HEIGHT = 350;
  
  $scope.model = {
    //legumeGenera : taxonChroma.legumeGenera, // for development only
    geoJson : geoJsonService,
    $location : $location,
    map : null,  // the leaflet map
    geoJsonLayer : null,
    geoJsonService : geoJsonService,  // array of geoJson objects
    center : {
      lat : $location.search().lat,
      lng : $location.search().lng,
    },
    geoCoordsSelect : false, // show geocoords selector ui
    baseMapSelect : false,   // show basemap selector ui
    mapHeight : DEFAULT_MAP_HEIGHT,
    mapHeightUndo : DEFAULT_MAP_HEIGHT,
    mapHeightSelect : false, // show map height selector ui
    baseMapLayer : null,
    maxResultsCircle : null,
    countries : [],
    baseMaps : {
      'ESRI - NatGeo (default, reference map)' : function() {
	return L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
	  attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
	  noWrap: true,
	});
      },
      'OpenTopoMap (terrain map)' : function() {
	return L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
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

    if(! ('mapHeight' in $location.search())) {
      $location.search('mapHeight', DEFAULT_MAP_HEIGHT);
    } else {
      $scope.model.mapHeight = parseInt($location.search().mapHeight);
    }
    
    $scope.model.map = L.map('map', {
      'center' : [$scope.model.center.lat, $scope.model.center.lng],
      'zoom' : parseInt($location.search().zoom),
    });
  
    $scope.model.map.attributionControl.addAttribution(
      'Data: USDA <a href="http://www.ars-grin.gov/npgs/" target="new">GRIN/NPGS</a>');
    geoJsonService.map = $scope.model.map;
    
    // add the default basemap
    $scope.model.baseMapLayer = $scope.model.baseMaps[DEFAULT_BASEMAP]();
    $scope.model.baseMapLayer.addTo($scope.model.map);
    $scope.model.geoJsonLayer = L.geoJson($scope.model.geoJsonService.data, {
      pointToLayer: function (feature, latlng) {
	// create circle marker and tag it with the accession #.
        return L.circleMarker(latlng, {
	  id : feature.accenumb,
	  radius: 8,
	  fillColor: feature.properties.color,
	  color: "#000",
	  weight: 1,
	  opacity: 1,
	  fillOpacity: 1,
	}).bindLabel(getMouseOverLabel(feature));
      },
      onEachFeature: function (feature, layer) {
	// bind a popup to each feature
	var accId = feature.properties.accenumb;
	var content = accId + '<br/>' + feature.properties.taxon;
	var popup = L.popup();
	popup.accId = accId; // cache the accession number in a property
	popup.setContent(content);
	layer.bindPopup(popup);
	if(accId === geoJsonService.selectedAccession) {
	  // for some reason openPopup won't work immediately, so delay 1 tick
	  $timeout(function() {
	    layer.openPopup();
}, 0);
	}
      },
      filter: filterNonGeocoded,
    });
    $scope.model.geoJsonLayer.addTo($scope.model.map);
    Cookies.set('baseMap', DEFAULT_BASEMAP);
    $location.search('baseMap', DEFAULT_BASEMAP);

    geoJsonService.subscribe($scope, 'selectedAccessionUpdated', function() {
      cleanupMarkerPopup();
    });
    
    geoJsonService.subscribe($scope, 'updated', function() {
      
      // update map and scope.model with any changes in bounds in the
      // bounds, or the center of the geoJsonService
      if(! $scope.model.map.getBounds().equals(geoJsonService.bounds)) {
	$scope.model.map.fitBounds(geoJsonService.bounds);
	if($scope.model.map.getZoom() > 10) {
	  // in case of single geocoded accession, fudge the zoom to something
	  // reasonable
	  $scope.model.map.setZoom(10);
	}
      }
      
      // update model so we can display lat/long of map center.
      var mapCenter = $scope.model.map.getCenter();
      $scope.model.center = {
	lat: mapCenter.lat.toFixed(2),
	lng: mapCenter.lng.toFixed(2),
      };

      // update url with lat/lng and zoom parameters.
      $location.search('lat', $scope.model.center.lat);
      $location.search('lng', $scope.model.center.lng);
      $location.search('zoom', $scope.model.map.getZoom());
      
      // remove previous map markers, and then update with the new geojson
      $scope.model.geoJsonLayer.clearLayers();
      
      var filteredGeoJson = $scope.model.geoJsonService.data;
      if(parseBool($location.search().traitExcludeUnchar) &&
	 $location.search().traitOverlay) {
	// exclude uncharacterized accessions for this trait
	filteredGeoJson = _.filter($scope.model.geoJsonService.data,
         function(d) {
	   var accId = d.properties.accenumb;
	   return accId in $scope.model.geoJsonService.traitHash;
	  });
      }
      $scope.model.geoJsonLayer.addData(filteredGeoJson);
      
      if($scope.model.map.getSize().y != $scope.model.mapHeight) {
        $scope.model.map.invalidateSize();
      }
      
      $timeout(addMaxResultsSymbology, 0);
      $timeout(fixMarkerZOrder, 0);
    });

    $scope.model.map.on('moveend', function(e) {
      /* moveend fires at the end of drag and zoom events as well.
       * don't subscribe to those events because it was causing
       * multiple queries to be issued for same extent. */
      
      // timeout to force this to be asynchronous
      $timeout(function() {
	var mapCenter = $scope.model.map.getCenter();
	$scope.model.center = {
	  lat: mapCenter.lat.toFixed(2),
	  lng: mapCenter.lng.toFixed(2),
	};
	// check if map and geoJsonService differ in extent (e.g. if
	// user is driving the map)
	var mapBounds = $scope.model.map.getBounds();
	if(! mapBounds.equals(geoJsonService.bounds)) {
	  // update geoJsonService to new bounds, and trigger a search.
	  geoJsonService.setBounds(mapBounds, true);
	}
      },0);
    });
    
    $scope.model.map.on('popupopen', function(e) {
      // use timeout to enter ng async event
      currentPopup = e.popup;
      $timeout(function() {
	var accId = e.popup.accId;
	if(accId) {
	  geoJsonService.setSelectedAccession(accId);
	}
      }, 0);
    });
    
    $scope.model.map.on('popupclose', function(e) {
      // use timeout to enter ng async event
      $timeout(function() {
	//markerPopup = null;
      }, 0);
    });

    geoJsonService.setBounds($scope.model.map.getBounds(), true);

  }; // init()


  $scope.onZoomToAccessions = function() {
    var b = geoJsonService.getBoundsOfGeoJSONPoints();
    if(b && '_southWest' in b) {
      geoJsonService.setBounds(b, false);
      $scope.model.map.fitBounds(b);
      if($scope.model.map.getZoom() > 10) {
	// in case of single geocoded accession, fudge the zoom to something
	// reasonable
	$scope.model.map.setZoom(10);
      }
    }
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
    $location.search('baseMap', name);
    Cookies.set('baseMap', name);
  };
  
  $scope.onSetCenter = function() {
    // user updated lat/long form values
    $scope.model.map.panTo($scope.model.center);
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
	$scope.model.map.panTo($scope.model.center);	
      });
    }
    $scope.model.geoCoordsSelect = false;
  };

  $scope.onMapHeight = function(direction) {
    // user hit map height adjustment button.
    var amount;
    if(direction === '+') {
      amount = window.innerHeight / 20;
    } else {
      amount = -1 * (window.innerHeight / 20);
    }
    var height = $scope.model.mapHeight;
    height += parseInt(amount);

    if(height  <= 0) {
      height = parseInt(window.innerHeight / 20);
    }
    else if(height > window.innerHeight) {
      height = window.innerHeight;
    }
    $scope.model.mapHeight = height;
    $location.search('mapHeight', height);
  };

  $scope.onMapHeightCancel = function() {
    // user cancelled the height adjustment
    $scope.model.mapHeightSelect = false;
    $location.search('mapHeight', $scope.model.mapHeightUndo);
    $scope.model.mapHeight = $scope.model.mapHeightUndo;
    $scope.model.map.invalidateSize();
  };
  
  $scope.onTour = function() {
    app.tour();
  };

  function get2CharAbbrev(feature) {
    var species = feature.properties.taxon.split(' ')[1];
    return species.substring(0,2);
  }
  
  function getMouseOverLabel(feature) {
    return feature.properties.accenumb + ' (' + feature.properties.taxon + ')';
  }
    
  function fixMarkerZOrder() {
    if(Boolean($location.search().traitOverlay)) {
      $scope.model.map.eachLayer(function(l) {
	if(_.has(l, 'feature.properties.haveTrait')) {
	  l.bringToFront();
	}
      });
    }
  }
  
  function addMaxResultsSymbology() {
    if($scope.maxResultsCircle) {
      $scope.model.map.removeLayer($scope.maxResultsCircle);
    }
    if(geoJsonService.data.length !== parseInt($location.search().maxRecs)) {
      return;
    }
    var bounds = geoJsonService.getBoundsOfGeoJSONPoints();
    if($scope.maxResultsCircle) {
      $scope.model.map.removeLayer($scope.maxResultsCircle);
    }
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    if(sw && ne) {
      var meters = sw.distanceTo(ne) * 0.5;
      $scope.maxResultsCircle = L.circle(bounds.getCenter(),meters, {
	color: 'rgb(245, 231, 158)',
	fill: false,
	opacity: 0.75,
      }).addTo($scope.model.map);
    }
  }

  $scope.getVisibleMarkerCount = function() {
    var bounds = $scope.model.map.getBounds();
    var ct = 0;
    $scope.model.geoJsonLayer.eachLayer(function(marker) {
      if (bounds.contains(marker.getLatLng())) {
        ct++;
      }
    });
    return ct;
  }

  $scope.showHiddenAccHelp = function() {
    if($scope.model.geoJson.updating) {
      return false;
    }
    if(! geoJsonService.data.length) {
      return false;
    }
    if(parseBool($location.search().traitExcludeUnchar)) {
      return false;
    }
    if($scope.getVisibleMarkerCount() === 0) {
      return true;
    }
    return false;
  }

  function filterNonGeocoded(featureData, layer) {
    /* GeoJson spec allows null coordinates (e.g. non-geocoded
     * accessions in our situation). However leafletjs errors on the
     * null coordinates, so filter them out here */
    return (featureData.geometry.coordinates !== null);
  }

  var currentPopup = null;
  function cleanupMarkerPopup() {
    if(currentPopup) {
      if( geoJsonService.selectedAccession === null ||
	  geoJsonService.selectedAccession !== currentPopup.accId) {
	$scope.model.map.closePopup(currentPopup);
	currentPopup = null;
      }
    }
    if(geoJsonService.selectedAccession !== null && ! currentPopup ) {
      $scope.model.geoJsonLayer.eachLayer( function(layer) {
	if(layer._popup.accId == geoJsonService.selectedAccession) {
	  layer.openPopup();
	}
      });
    }
  }

  $scope.init();
  
});
