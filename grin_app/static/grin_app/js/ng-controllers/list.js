/*
 * listController
 */
"use strict";

app.controller('listController',
function($scope, $state, $http, $sanitize, geoJsonService) {
  
  $scope.model = {
    geoJson: geoJsonService,
    searchHilite: null,
  };
  
  $scope.init = function() {
    geoJsonService.subscribe($scope, 'updated', function() {
      $scope.model.searchHilite = geoJsonService.taxonQuery;
    });
  };
  
  $scope.init();
});
