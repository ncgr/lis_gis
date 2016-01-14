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
    traitScale : searchParams.traitScale,
    traitExcludeUnchar : searchParams.traitExcludeUnchar,
  };
  
  $scope.init = function() {
    $http.get(API_PATH + '/countries').then(function(resp) {
      // success callback
      $scope.model.countries = resp.data;
    }, function(resp){
      // error callback
      console.log(resp);
    });
    if($scope.model.taxonQuery) {
      $scope.onTaxonQuery($scope.model.taxonQuery);
    }
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
    geoJsonService.setTraitScale($scope.model.traitScale, false);
    geoJsonService.setTraitExcludeUnchar($scope.model.traitExcludeUnchar, false);
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

  $scope.onTaxonQuery = function(taxon) {
    // taxon query field was typed or updated. filter the trait
    // descriptors to match
    if(! taxon || taxon.length < 3) {
      return;
    }
    $scope.model.traitDescriptors = null;
    var oldTrait = $scope.model.traitOverlay;
    $http( {
      url : API_PATH + '/evaluation_descr_names',
      method : 'GET',
      params : {
	'taxon' : taxon,
      },
    }).then(
      function(resp) {
	// success handler
	$scope.model.traitDescriptors = resp.data;
	if(oldTrait in $scope.model.traitDescriptors) {
	  $scope.model.traitOverlay = oldTrait;
	}
      },
      function(resp) {
	// error handler
	console.log(resp);
      }
    );
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
    $scope.model.traitOverlay = 'SEEDWGT';
    $scope.model.taxonQuery = 'Phaseolus vulgaris';
    $scope.onTaxonQuery($scope.model.taxonQuery);
  };

  $scope.onExampleTaxonQuery = function() {
    $scope.model.taxonQuery = 'Arachis hypogaea';
    $scope.model.limitToMapExtent = false;
    $scope.model.country = null;
    $scope.model.accessionIds = null;
    $scope.model.traitOverlay = null;
    $scope.onTaxonQuery($scope.model.taxonQuery);
  };
  
  $scope.init();
  
});
