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
	 $timeout,
	 geoJsonService) {
  
  $scope.model = {
    geoJson: geoJsonService,
    searchHilite: null,
    hiliteAccNumb : null,
    staticURL : STATIC_URL,
  };
  
  $scope.init = function() {
    geoJsonService.subscribe($scope, 'updated', function() {
      $scope.model.searchHilite = geoJsonService.taxonQuery;
    });
    
    geoJsonService.map.on('popupopen', function(e) {
      // use timeout to enter ng async event
      $timeout(function() {
	// the accession number, in some use cases, is stored as a
	// property on the popup.
	var accNum = e.popup.getContent().split('<')[0];
	if( ! accNum) {
	  return;
	}
	hiliteAccNumbInTable(accNum);
      }, 0);
    });
    
    geoJsonService.map.on('popupclose', function(e) {
      // the accession number, in some use cases, is stored as a
      // property on the popup.
      // use timeout to enter ng async event      
      $timeout(function() {
	$scope.model.hiliteAccNumb = null;	
      }, 0);
    });
  };

  $scope.onAccessionDetail = function(acc) {
    var accDetail = null;
    
    $http({
      url : 'accession_detail',
      method : 'GET',
      params : { accenumb : acc },
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
	  $scope.onGoInternalMap(accDetail);
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

  function hiliteAccNumbInTable(accNum) {
    // splice the record to beginning of geoJson dataset
    var accession = _.find(geoJsonService.data, function(d) {
      return (d.properties.accenumb === accNum);
    });
    if( ! accession) {
      return;
    }
    var idx = _.indexOf(geoJsonService.data, accession);
    if(idx === -1) {
      return;
    }
    geoJsonService.data.splice(idx, 1);
    geoJsonService.data.splice(0, 0, accession);
    $scope.model.hiliteAccNumb = accNum;    
  };
  
  function onGoExternalLISTaxon(accDetail)  {
    var url = 'http://legumeinfo.org/organism/' +
	encodeURIComponent(accDetail.properties.genus) + '/' +
	encodeURIComponent(accDetail.properties.species);
    $window.open(url, 'LIS');
  }

  function onGoExternalLISGRIN(accDetail) {
    var url = 'http://legumeinfo.org/grinconnect/query?grin_acc_no='+
	encodeURIComponent(accDetail.properties.accenumb);
    $window.open(url, 'LIS');
  }
  
  $scope.onGoInternalMap = function(accDetail) {
    /* user hit a map marker buton in the results table */
    
    // convert from geoJson point to leafletjs point
    var accNum = accDetail.properties.accenumb;
    var lng = accDetail.geometry.coordinates[0];
    var lat = accDetail.geometry.coordinates[1];
    var center = { 'lat' : lat, 'lng' : lng };

    // register callback from geoJsonService after search is updated
    // for new extent.
    var unsub = geoJsonService.subscribe($scope, 'updated', function() {
      $timeout(function() {
	// display a popup
	var content = accNum +
    	    '<br/>' + accDetail.properties.taxon;
	var popup = L.popup()
    	    .setLatLng(center)
    	    .setContent(content)
    	    .openOn(geoJsonService.map);
	hiliteAccNumbInTable(accNum);
	// bring the matching marker forward in the map view
	var marker = _.find(geoJsonService.map._layers, function(l) {
    	  if(_.has(l, 'feature.properties.accenumb')) {
    	    return (l.feature.properties.accenumb === accNum);
    	  }
    	  return false;
	});
	if(marker) {
    	  marker.bringToFront();
	}
	unsub(); // dispose of the callback
      }, 0);
    });
    
    // force the search to update (even if already centered at this
    // position, we definitely want the above callback to run)
    var c = L.latLng(lat, lng);
    if(c.equals(geoJsonService.map.getCenter())) {
      // the map is already centered at this coordinate. this is kind
      // of a hack, but force the update via the geoJsonService
      geoJsonService.bounds = L.latLngBounds(L.latLng(0,0), L.latLng(0,0));
      geoJsonService.setBounds(geoJsonService.map.getBounds(), true);
    }
    else {
      // drive the update via the map, to get the new bounds from it's
      // update event.
      geoJsonService.map.panTo(c);
    }
  };
  
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
