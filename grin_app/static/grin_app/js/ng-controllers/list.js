/*
 * listController
 */
"use strict";

app.controller('listController',
function($scope,
	 $state,
	 $http,
	 $sanitize,
	 $uibModal,
	 $window,
	 geoJsonService) {
  
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
    var accDetail = null;
    
    $http({
      url : 'accession_detail',
      method : 'GET',
      params : {
	accenumb : acc,
      },
    }).then(function(resp) {
      // success callback
      accDetail = resp.data[0];
      var modalInstance = $uibModal.open({
    	animation: true,
    	templateUrl: 'accession-modal-content.html',
    	controller: 'ModalInstanceCtrl',
    	size: 'lg',
    	resolve: {
          accession: function() { return accDetail; },
    	}
      });
      modalInstance.result.then(function (action) {
	// modal closed callback
	switch(action) {
	case 'ok':
	  break;
	case 'go-internal-map':
	  onGoInternalMap(accDetail);
	  break;
	case 'go-external-lis-taxon':
	  onGoExternalLISTaxon(accDetail);
	  break;
	case 'go-external-lis-grin':
	  onGoExternalLISGRIN(accDetail);
	  break;
	}
      }, function () {
	// modal dismissed callback
      });
    }, function(resp) {
      // error callback
    });
  };

  function onGoExternalLISTaxon(accDetail)  {
    /* redirect to legumeinfo.org/organism */
    var url = 'http://legumeinfo.org/organism/' +
	encodeURIComponent(accDetail.properties.genus) + '/' +
	encodeURIComponent(accDetail.properties.species);
    $window.location.href = url;
  }

  function onGoExternalLISGRIN(accDetail) {
    var url = 'http://legumeinfo.org/grinconnect/query?grin_acc_no='+
	encodeURIComponent(accDetail.properties.accenumb);
    $window.location.href = url;
  }
  
  function onGoInternalMap(accDetail) {
    // convert from geoJson point to leafletjs point
    var lng = accDetail.geometry.coordinates[0];
    var lat = accDetail.geometry.coordinates[1];
    var center = { 'lat' : lat, 'lng' : lng };
    var handler = geoJsonService.subscribe($scope, 'updated', function() {
      // register a callback for after map is scrolled to new center
      var content = accDetail.properties.accenumb +
	  '<br/>' + accDetail.properties.taxon;
      var popup = L.popup()
	  .setLatLng(center)
	  .setContent(content)
	  .openOn(geoJsonService.map);
      handler(); // unsubscribe the callback
    });
    geoJsonService.setCenter(center, true);
  }
  
  $scope.init();
  
});

app.controller('ModalInstanceCtrl',
function ($scope, $uibModalInstance, accession) {
  $scope.acc = accession;
  $scope.init = function() {
     /* we should verify with $http.get whether there is a taxon page at lis
      * matching, e.g.  http://legumeinfo.org/organism/Cajanus/cajan but
      * this fails with: */
    
    /* Response to preflight request doesn't pass access control
     * check: No 'Access-Control-Allow-Origin' header is present on
     * the requested resource. Origin 'http://localhost:8001' is
     * therefore not allowed access. */
  };
  
  $scope.onOK = function () {
    // user hit ok button
    $uibModalInstance.close('ok');
  };
  
  $scope.onGoMap = function () {
    // user hit view on map button
    $uibModalInstance.close('go-internal-map');
  };
  
  $scope.onGoLISTaxon = function () {
    // user View taxon at LIS button
    $uibModalInstance.close('go-external-lis-taxon');  
  };
  
  $scope.onGoLISGRIN = function () {
    // user hit search USDA GRIN button
    $uibModalInstance.close('go-external-lis-grin');
  };

  $scope.init();
  
});
