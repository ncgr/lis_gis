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
    accessionIds : searchParams.accessionIds,
    traitOverlay : null,
  };
  
  $scope.init = function() {
    $http.get(API_ROOT + '/countries').then(function(resp) {
      // success callback
      $scope.model.countries = resp.data;
    }, function(resp){
      // error callback
      console.log(resp);
    });
    $http.get(API_ROOT + '/evaluation_descr_names').then(function(resp) {
      // success callback
      $scope.model.traitDescriptors = resp.data;
    }, function(resp){
      // error callback
      console.log(resp);
    });
  };

  $scope.onOK = function() {
    // user hit OK in the search parameters panel
    // force all of our model into geoJson and trigger search.  this
    // may be redundant but catches some edge cases where user input
    // events are not caught and they close out with OK button.
    $scope.model.autofocusField = null;
    $scope.model.alert = null;
    $scope.model.searchOptions = false;
    geoJsonService.setMaxRecs($scope.model.maxRecs, false);
    geoJsonService.setLimitToMapExtent($scope.model.limitToMapExtent, false);
    geoJsonService.setTaxonQuery($scope.model.taxonQuery, false);
    geoJsonService.setCountry($scope.model.country, false);
    geoJsonService.setAccessionIds($scope.model.accessionIds, false);
    geoJsonService.setTraitOverlay($scope.model.traitOverlay, false);
    geoJsonService.search();
  };

  $scope.onAccessionIds = function(s) {
    $scope.model.limitToMapExtent = false;
    geoJsonService.setLimitToMapExtent(false, false);
    geoJsonService.setAccessionIds(s, true);
    $scope.model.alert = null;
    $scope.model.searchOptions = false;
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

   $scope.onTraitOverlay = function(q) {
     $scope.model.autofocusField = null;
     $scope.model.alert = null;
     $scope.model.searchOptions = false;
     geoJsonService.setTraitOverlay(q, true);
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
