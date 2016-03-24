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
  $scope.model.fileMethod = null;
  $scope.model.results = null;

  if (! Papa) {
    throw('PapaParse javascript library is required.');
  }

  /* uniquify the errors and display in rootscope */
  function displayPapaParseErrors(errors) {
    var uniqErrors = _.uniqBy(errors, function(e) {
        return e.code;
    });
    _.each(uniqErrors, function(e) {
        console.log(e);
        var msg = e.message + ' (row: ' + e.row + ')';
        $scope.errors.push(msg);
    });
    $scope.$apply();
  }

   function onParseComplete(results) {
        // results has data, errors, and meta properties. inspect to
        // see if there were any errors.
        if(results.errors.length) {
            displayPapaParseErrors(results.errors);
            return;
        }
        if(results.meta.fields.indexOf('accession_id') === -1) {
            $scope.errors.push('missing required header: accession_id');
        }
        if($scope.errors.length) {
            $scope.$apply();
            return;
        }
        $scope.model.results = results;
        $scope.$apply();
        // now user can review the csv parsing, and then hit OK
        console.log(results);
   }

  $scope.onLoadFile = function() {
      $scope.model.results = null;
      $scope.errors = [];
      $('input[type=file]').parse({
          config: {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: onParseComplete
          },
          before: function(file, inputElem) {
            // executed before parsing each file begins;
            // what you return here controls the flow
          },
          error: function(err, file, inputElem, reason) {
            // executed if an error occurs while loading the file,
            // or if before callback aborted for some reason. (note this is
            // separate from a parsing error)
            console.log(err);
            $scope.errors.push(err + ' ' + file + ' ' + reason);
            $scope.$apply();
          },
          complete: function() {
            // executed after all files are complete
          }
      });
  };

  $scope.onOK = function () {
    $uibModalInstance.close($scope.model);
  };
  
  $scope.onCancel = function () {
    $uibModalInstance.close(null);
  };

});
