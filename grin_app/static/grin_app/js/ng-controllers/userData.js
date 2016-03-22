'use strict';

/*
  userDataController:
  - use PapaParse js library to parse delimited text to json.
  - allow local file parsing.
  - allow http download too.
  - support user add/remove collections of data.
  - store json in local storage api.
  - notify geoJsonService about user data collections so it can
     merge/overlay into geoJson data structure.
 
  Requirements:
  - html5 local storage api support via angular ngStorage lib
     (github.com/gsklee/ngStorage, cdnjs.cloudflare.com/ajax/libs/ngStorage)
  - PapaParse (papaparse.com, cdnjs.cloudflare.com/ajax/libs/PapaParse)
 */

app.controller('userDataController',
function($scope, $localStorage, $uibModalInstance, model, geoJsonService) {

  var that = this;
  $scope.model = model;
  
  if (! Papa) {
    throw('PapaParse javascript library is required.');
  }
   
  $scope.onOK = function () {
    $uibModalInstance.close($scope.model);
  };
  
  $scope.onCancel = function () {
    $uibModalInstance.close(null);
  };
  
});
