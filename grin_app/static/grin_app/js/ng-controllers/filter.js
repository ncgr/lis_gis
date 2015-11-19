/*
 * filterController; search settings and user controls
 */
"use strict";

app.controller('filterController',
function($scope, $state, $http, geoJsonService) {
		 
  $scope.model = {
    geoJson: geoJsonService,
    country: null,
    countries: [],
    maxRecs : geoJsonService.maxRecs,
    limitToMapExtent : geoJsonService.limitToMapExtent,
    taxonFilter : null,
    searchOptions: false,
    autofocusField : null,
    alert : null,
  };

  $scope.init = function() {
    $http.get('/countries').then(function(resp) {
      // success callback
      $scope.model.countries = resp.data;
    }, function(resp){
      // error callback
      console.log(resp);
    });
  };
  
  $scope.onSetMaxRecs = function(max) {
    geoJsonService.setMaxRecs(Number(max), true);
    $scope.model.alert = null;
    $scope.model.searchOptions = false;    
  };

  $scope.onLimitToMapExtent = function(bool) {
    geoJsonService.setLimitToMapExtent(bool, true);
    $scope.model.searchOptions = false;
  };

  $scope.onTaxonFilter = function(q) {
    $scope.model.autofocusField = null;
    $scope.model.alert = null;
    $scope.model.searchOptions = false;    
    geoJsonService.setTaxonQuery(q, true);
  };

  $scope.onSetCountry = function(cty) {
    $scope.model.alert = null;
    $scope.model.searchOptions = false;    
    geoJsonService.setCountry(cty, true);
  };
  
  $scope.onRemoveMaxResults = function() {
    $scope.model.autofocusField = 'maxRecs';
    $scope.model.searchOptions = true;
    $scope.model.alert='Max results: You can set the limit of search results, '+
      ' but cannot remove the limit.';
  };
 
  $scope.init();
  
});
