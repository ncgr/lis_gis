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
	 $location,
	 geoJsonService) {
  
  $scope.model = {
    geoJson: geoJsonService,
    $location : $location,
    searchHilite: null,
    showAssistiveButton : false,
    showAssistiveText : null,
    STATIC_PATH : STATIC_PATH,
  };

  $scope.init = function() {
    
    geoJsonService.subscribe($scope, 'updated', function() {
      // callback for geoJsonService updated search results
      updateQueryHiliting();
      updateAssistiveButton();
    });

    geoJsonService.subscribe($scope, 'selectedAccessionUpdated', function() {
      // scroll to top of results list, because the selected accession
      // will be hilited there
      var resultsList = $('#search-results');
      var scroll = resultsList.scrollTop();
      if(scroll > 0) {
	$(resultsList).animate({ scrollTop: 0 }, "slow");
      }
    });
  };

  $scope.onAccessionDetail = function(accId) {
    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'accession-modal-content.html',
      controller: 'accessionDetailController',
      size: 'lg',
      resolve: {
        accId: function() { return accId; },
      }
    });
    modalInstance.result.then(function (action) {
      // modal closed callback
      switch(action.choice) {
      case 'ok':
	break;
      case 'go-internal-map':
	$scope.onGoInternalMap(action.accDetail);
	break;
      case 'go-external-lis-taxon':
	onGoExternalLISTaxon(action.accDetail);
	break;
      case 'go-external-lis-grin':
	onGoExternalLISGRIN(action.accDetail);
	break;
      }
    }, function () {
      // modal dismissed callback
    });
  };
  
  $scope.onGoInternalMap = function(accDetail) {
    /* user hit a map marker buton in the results table */
    
    // convert from geoJson point to leafletjs point
    var accNum = accDetail.properties.accenumb;
    var lng = accDetail.geometry.coordinates[0];
    var lat = accDetail.geometry.coordinates[1];
    var center = { 'lat' : lat, 'lng' : lng };

    geoJsonService.setSelectedAccession(accNum);
    
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

  $scope.onAssistiveButtonAllNearby = function() {
    geoJsonService.showAllNearby();
  };
  
  $scope.onAssistiveButtonTaxonNearby = function() {
    geoJsonService.showAllNearbySameTaxon();
  };
  
  function updateAssistiveButton() {
    if(! ('accessionIds' in geoJsonService.params)) { return; }
    if(geoJsonService.data.length !== 1) { return; }
    if(! geoJsonService.getAnyGeocodedAccession()) { return; };
    var acc = geoJsonService.data[0];
    $scope.model.showAssistiveButton = true;
    $scope.model.showAssistiveText = acc.properties.taxon;
  }
 
  function onGoExternalLISTaxon(accDetail)  {
    var url = '/organism/' +
	encodeURIComponent(accDetail.properties.genus) + '/' +
	encodeURIComponent(accDetail.properties.species);
    $window.open(url, 'LIS');
  }

  function onGoExternalLISGRIN(accDetail) {
    var url = '/grinconnect/query?grin_acc_no='+
	encodeURIComponent(accDetail.properties.accenumb);
    $window.open(url, 'LIS');
  }

  function updateQueryHiliting() {
    $scope.model.searchHilite = null;
    var query = geoJsonService.params.taxonQuery
	       || geoJsonService.params.accessionIds;
    if(! query) { return; }
    // logical operators may (usually) work as ng string
    // highlighting, but the whitespace needs to be cleaned up a bit
    query = query.replace(/,/g,'|');
    query = query.replace(/\s+\|\s+/,'|');
    query = query.replace(/\s+\&\s+/,'&');
    $scope.model.searchHilite = query.trim();
  }
  
  $scope.init();
  
});

