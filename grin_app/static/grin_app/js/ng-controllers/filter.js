/*
 * filterController; search settings and user controls
 */
"use strict";

app.controller('filterController',
function($scope, $state, $http, geoJsonService) {
		 
  $scope.model = {
    geoJson: geoJsonService,
    center : { lat: null, lng: null },
    maxRecs : geoJsonService.maxRecs,
    limitToGeocoded : geoJsonService.limitToGeocoded,
    limitToMapExtent : geoJsonService.limitToMapExtent,
    taxonFilter : null,
  };


  $scope.init = function() {
    geoJsonService.subscribe($scope, 'updated', function() {
      var center = geoJsonService.map.getCenter();
      $scope.model.center = {
	lat: center.lat.toFixed(2),
	lng: center.lng.toFixed(2),
      };
      //$scope.model.maxRecs = geoJsonService.maxRecs;
    });
  };
  
  $scope.onSetCenter = function() {
    // user updated lat/long form values
    geoJsonService.setCenter($scope.model.center, true);
  };

  $scope.onSetMaxRecs = function(max) {
    geoJsonService.setMaxRecs(max, true);
  };

  $scope.onLimitToGeocoded = function(bool) {
    geoJsonService.setLimitToGeocoded(bool, true);
  };

  $scope.onLimitToMapExtent = function(bool) {
    geoJsonService.setLimitToMapExtent(bool, true);
  };

  $scope.onTaxonFilter = function(q) {
    geoJsonService.setTaxonQuery(q, true);
  };
  
  $scope.onGeoLocate = function() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
	$scope.model.center = {
	  lat : position.coords.latitude,
	  lng : position.coords.longitude,
	};
	geoJsonService.setCenter($scope.model.center, true);
	console.log($scope.model.center);
      });
    }
  };
  
  $scope.init();		 
});
