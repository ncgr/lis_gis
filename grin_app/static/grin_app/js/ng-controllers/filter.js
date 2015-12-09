/*
 * filterController; search settings and user controls
 */
"use strict";

app.controller('filterController',
function($scope, $state, $http, $location, geoJsonService) {

  var searchParams = $location.search();

  $scope.model = {
    geoJson: geoJsonService,
    countries: [],
    searchOptions: false,
    autofocusField : null,
    alert : null,
    $location : $location,
    limitToMapExtent : searchParams.limitToMapExtent,
    maxRecs : searchParams.maxRecs,
    country : searchParams.country,
    taxonQuery : searchParams.taxonQuery,
  };
  
  $scope.init = function() {
    $http.get('countries').then(function(resp) {
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

  $scope.onTaxonQuery = function(q) {
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
