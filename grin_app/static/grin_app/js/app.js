/* instantiate ng-app 'grin' */
"use strict";

var app = angular.module('grin',
			 ['ngCookies',
			  'ngSanitize',
			  'mp.autoFocus',
			  'ui.bootstrap',
			  'ui.router']);

app.config( function($httpProvider, $stateProvider, $sceProvider) {
  
  $stateProvider
    .state('search', {
      views: {
	'filter' : {
	  templateUrl: 'static/grin_app/partials/search-filter.html',
	  controller: 'filterController',
	},
	'list' : {
	  templateUrl: 'static/grin_app/partials/search-list.html',
	  controller: 'listController',
	},
	'map' : {
	  templateUrl: 'static/grin_app/partials/search-map.html',
	  controller: 'mapController',
	},
      }
    });
  
  function httpErrorInterceptor($q) {
    function requestError(rejection) {
      console.log('requestError:');
      console.log(rejection);
      return($q.reject(rejection));  // pass-through the rejection.
    }
    function responseError(response) {
      console.log('responseError:')
      console.log(response);
      if(response.status === 0 || response.status === -1) {
	var msg = 'Lost connection to web app. ' +
            'Check your network connection, or check web server process.';
	console.log(msg);
      }
      else if(response.status === 404 || response.status === 500) {
	var msg = [response.status + ' '+
		   response.statusText + ' '+
		   response.config.url + ' ',
		   response.data];
      }
      return($q.reject(response)); // pass-through the response
    }
    return({
      requestError: requestError,
      responseError: responseError
    });
  }
    
  $httpProvider.interceptors.push(httpErrorInterceptor);
  $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

});

app.filter('highlight', function($sce) {
  return function(text, phrase) {
    if (phrase) {
      var text = text.replace(new RegExp('('+phrase+')', 'gi'),
			      '<span class="hilite-text">$1</span>');
    }
    return $sce.trustAsHtml(text);
  }
});
  
app.run( function($http, $cookies, $state) {
  var csrfTokenKey = 'csrftoken';
  var csrfHeader = 'X-CSRFToken';
  $http.defaults.headers.post[csrfHeader] = $cookies.get(csrfTokenKey)
  // http://django-angular.readthedocs.org/en/latest/basic-crud-operations.html
  // Another quick change is required to Angular app config, without
  // this DELETE requests fail CSRF test. Add the following two lines
  $http.defaults.xsrfCookieName = csrfTokenKey;
  $http.defaults.xsrfHeaderName = csrfHeader;

  $state.transitionTo('search');
});

var tourId = 'lis-germplasm-mapper-tour';
    
app.run(function(geoJsonService, $timeout, $rootScope) {
  /* after the ui and search results have finished loading, start the
   * hopscotch tour. the tour needs to bind to dom elements by id, so
   * it cannot be started before angular compiles the html */
  if(Cookies.get(tourId)) {
    return; // already seen tour
  }
  
  var handler = geoJsonService.subscribe($rootScope, 'updated', function() {
    $timeout(app.tour, 500); // want it to appear after the map renders
    handler(); // unsubscribe
  });
});

app.tour = function () {
  var tour = {
    id: tourId,
    showPrevButton: true,
    steps: [
      {
        title: 'Welcome',
        content: 'This is a short tour of the LIS Germplasm map viewer. This \
         web app allows you to search and locate germplasm accessions for \
         legume genera.',
        target: 'tour-start',
        placement: 'top',
      },
      {
        title: 'Map Frame',
        content: 'You can drag the map to pan the extent, and use your \
         mouse-wheel to zoom in and out, or use the [+/-] buttons. (The same \
         as google maps and many other web maps). Try it!',
        target: 'map',
        placement: 'bottom',
      },
      {
        title: 'Map Markers',
        content: 'Click on a circular map marker to select this accession and \
         get more details.  Try it!',
	target: 'map',
        placement: 'bottom',
      },          
      {
        title: 'Results Table',
        content: 'The accessions shown here are automatically synced with the \
         search results, and with the map frame.',
        target: 'results-list',
        placement: 'top',
      },
      {
        title: 'Accession Id Buttons',
        content: 'Click on an accession id to get more details, including \
         links out to search other resources. Try it!',
        target: 'tour-accession-btn',
        placement: 'top',
      },
      {
        title: 'Locator Buttons',
        content: 'Click on the  <span class="glyphicon \
         glyphicon-map-marker"="true"></span> location icon to select, center \
         and reveal this accession on the map.  Try it!',
        target: 'tour-coords-btn',
        placement: 'top',
      },
      {
        title: 'Set Search Parameters',
        content: 'Click on the Search button to reveal search settings. Then \
         click OK to close the search parameters panel. Try it!',
        target: 'tour-start',
        placement: 'top',
      }, 
      {
        title: 'Your Search Filters',
        content: 'Your current search filters are always listed here. You can \
         click the  <span class="glyphicon glyphicon-remove"></span> to \
         remove any filter. Your map view and results listing are updated \
         automatically. Try it!',
        target: 'current-search-filters',
        placement: 'top',
      },
      {
        title: 'Change Base Map',
        content: 'You can adjust the base map for a different appearance, if \
         desired. This does not effect your search results!',
        target: 'change-base-map-btn',
        placement: 'bottom',
      },    
      {
        title: 'Geographic Coordinates',
        content: 'Click this button to view the current center of the map in \
         latitude and longitude. Or enter new coordinates to go there. \
         Remember: the search results are updated automatically.',
        target: 'enter-coords-btn',
        placement: 'bottom',
      },      
      {
        title: 'Geolocate',
        content: 'Click this button to go to your current geolocation (note: \
         you may be prompted to allow this request by your browser). \
         Remember: the search results are updated automatically.',
        target: 'geolocate-btn',
        placement: 'bottom',
      },
      {
        title: 'Revisit this tour',
        content: 'Click this button anytime to re-open this tour of the web \
         app. Thanks!',
        target: 'tour-btn',
        placement: 'bottom',
      },
    ],
  };
  hopscotch.startTour(tour, 0);
  Cookies.set(tourId, true);
};

