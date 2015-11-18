/*
 * filterController; search settings and user controls
 */
"use strict";

app.controller('filterController',
function($scope, $state, $http, geoJsonService) {
		 
  $scope.model = {
    geoJson: geoJsonService,
    maxRecs : geoJsonService.maxRecs,
    limitToGeocoded : geoJsonService.limitToGeocoded,
    limitToMapExtent : geoJsonService.limitToMapExtent,
    taxonFilter : null,
    searchOptions: false,
    autofocusField : null,
    alert : null,
  };

  // $scope.init = function() {
  // };
  
  $scope.onSetMaxRecs = function(max) {
    geoJsonService.setMaxRecs(max, true);
    $scope.model.alert = null;
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

  $scope.onRemoveMaxResults = function() {
    $scope.model.autofocusField = 'maxRecs';
    $scope.model.searchOptions = true;
    $scope.model.alert='Max results: You can set the limit of search results, '+
      ' but cannot remove the limit.';
  };
 
  //$scope.init();		 
});
