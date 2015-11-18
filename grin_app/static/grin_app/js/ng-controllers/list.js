/*
 * listController
 */
"use strict";

app.controller('listController',
function($scope, $state, $http, $sanitize, $uibModal, geoJsonService) {
  
  $scope.model = {
    geoJson: geoJsonService,
    searchHilite: null,
  };
  
  $scope.init = function() {
    geoJsonService.subscribe($scope, 'updated', function() {
      $scope.model.searchHilite = geoJsonService.taxonQuery;
    });
  };

  $scope.onAccessionDetail = function(acc) {
    $http({
      url : 'accession_detail',
      method : 'GET',
      params : {
	accenumb : acc,
      },
    }).then(function(resp) {
      // success callback
      var modalInstance = $uibModal.open({
    	animation: true,
    	templateUrl: 'accession-modal-content.html',
    	controller: 'ModalInstanceCtrl',
    	size: 'lg',
    	resolve: {
          accession: function() {
    	    return resp.data[0];
          },
    	}
      });
      modalInstance.result.then(function () {
      }, function () {
    	//$log.info('Modal dismissed at: ' + new Date());
      });
    }, function(resp) {
      // error callback
    });
    console.log(acc);
  };
  
  $scope.init();
});

app.controller('ModalInstanceCtrl',
function ($scope, $uibModalInstance, accession) {
		 
  delete accession.properties['gid'];
  delete accession.properties['geographic_coord'];
  delete accession.properties['acckey'];
  delete accession.properties['taxon_fts'];
  delete accession.properties['othernumb'];
  
  $scope.acc = accession;
  $scope.ok = function () {
    $uibModalInstance.close();
  };
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});
