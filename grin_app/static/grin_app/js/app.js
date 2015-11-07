/* instantiate ng-app 'grin' */
"use strict";

var app = angular.module('grin',
			 ['ngCookies',
			  'ngSanitize',
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

