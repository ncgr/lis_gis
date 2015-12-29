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
    traitOverlay : searchParams.traitOverlay,
  };
  
  $scope.init = function() {
    $http.get(API_PATH + '/countries').then(function(resp) {
      // success callback
      $scope.model.countries = resp.data;
    }, function(resp){
      // error callback
      console.log(resp);
    });
    $http.get(API_PATH + '/evaluation_descr_names').then(function(resp) {
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
    geoJsonService.setGeocodedAccessionsOnly($scope.model.country !==null, false);
    geoJsonService.setMaxRecs($scope.model.maxRecs, false);
    geoJsonService.setLimitToMapExtent($scope.model.limitToMapExtent, false);
    geoJsonService.setTaxonQuery($scope.model.taxonQuery, false);
    geoJsonService.setCountry($scope.model.country, false);
    geoJsonService.setAccessionIds($scope.model.accessionIds, false);
    geoJsonService.setTraitOverlay($scope.model.traitOverlay, false);
    geoJsonService.search();
  };
 
  $scope.onRemoveMaxResults = function() {
    $scope.model.autofocusField = 'maxRecs';
    $scope.model.searchOptions = true;
    $scope.model.alert='Max results: You can set the limit of search results, '+
      ' but cannot remove the limit.';
  };

  $scope.onCountry = function(country) {
    if(country) {
      $scope.model.limitToMapExtent = false;
      geoJsonService.setGeocodedAccessionsOnly(true, false);
      geoJsonService.setLimitToMapExtent(false, false);
    }
  };

  $scope.onExampleAccessions = function() {
    $scope.model.limitToMapExtent = false;
    $scope.model.country = null;
    $scope.model.taxonQuery = null;
    $scope.model.accessionIds = 'PI 257413,W6 36352,PI 257412,PI 257416,\
      PI 661801,PI 642123,W6 17477,W6 36350';
  };

  $scope.onTraitOverlayExample = function() {
    $scope.model.limitToMapExtent = false;
    $scope.model.country = null;
    $scope.model.accessionIds = null;
    $scope.model.taxonQuery = 'Phaseolus vulgaris';
    $scope.model.traitOverlay = 'SEEDWGT';
  };
  
  $scope.init();
  
});
