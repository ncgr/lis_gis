"use strict";

/*

userFile2JSONService

An angular-js service to allow user to load a .csv or .tsv delimited
text file into a JSON data structure. For example to source user
provided GeoJson to be used by the lis_gis.

Requirements: 

- html5 File API support (we check for this in init())
- html5 Local Storage API support via 
     angular ngStorage lib (cdnjs.cloudflare.com/ajax/libs/ngStorage/...)
- lodash (cdnjs.cloudflare.com/ajax/libs/lodash.js/...)

*/

app.service('userFile2JSONService',
function($rootScope, $localStorage) {
  
  var that = this; /* http://javascript.crockford.com/private.html */
  
  /* private constants */
  var EVENT_PREFIX = 'userFile2JSONService_';
  
  /* private vars */

  /* public properties & functions */
  
  /* pub-sub event model adapted from
     http://www.codelord.net/2015/05/04/angularjs-notifying-about-changes-from-services-to-controllers/  */
  this.subscribe = function(scope, eventName, callback) {
    if(! _.includes(that.events, eventName)) {
      throw 'invalid eventName ' + eventName;
    }
    var handler = $rootScope.$on(EVENT_PREFIX + eventName, callback);
    scope.$on('$destroy', handler);
    return handler;
  };
  
  this.notify = function(eventName) {
    $rootScope.$emit(EVENT_PREFIX + eventName);
  };
   
  function init() {
    if ( ! window.File || ! window.FileReader) {
      throw('The File APIs are not fully supported in this browser.');
    }
    if (! _) {
      throw('lodash javascript library is required');
    }
  }
  
  init();

});
