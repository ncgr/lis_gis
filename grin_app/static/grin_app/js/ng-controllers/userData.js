'use strict';

/*
 userDataController:
 - use PapaParse js library to parse delimited text to json.
 - allow local file parsing.
 - allow http download too.
 - support user add/remove collections of data.
 - store json in local storage api.
 - return parsed/combined geoJson on dialog close.

 Requirements:
 - html5 local storage api support via angular ngStorage lib
 (github.com/gsklee/ngStorage, cdnjs.cloudflare.com/ajax/libs/ngStorage)
 - PapaParse (papaparse.com, cdnjs.cloudflare.com/ajax/libs/PapaParse)
 */

app.controller('userDataController',
    function ($scope, $localStorage, $uibModalInstance, $http, $timeout,
              model) {

        var that = this;
        var ppConfig = {
            header: true,
            encoding: 'utf-8',
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: onParseComplete
        };

        $scope.model = model;
        $scope.model.showWelcome = true;
        $scope.model.fileMethod = 'local'; // 'local' or 'url'
        $scope.model.results = null; // results from parsing delimited data
        $scope.model.sets = null;
        $scope.model.previewLimit = 5;
        $scope.model.savedUserData = $localStorage.userData;
        $scope.model.convertingGeoJSON = false;

        // the user's csv->json original data
        $localStorage.userData = $localStorage.userData || {};
        // geojson and trait json will be parsed on dismissal of this dialog.
        $localStorage.userGeoJson = null;
        $localStorage.userTraitJson = null;


        if (!Papa) {
            throw('PapaParse javascript library is required.');
        }

        $scope.onLoadURL = function() {
            var url = $scope.model.fileURL;
            var config = angular.extend({}, ppConfig);
            config.download = true;
            Papa.parse(url, config);
        };

        $scope.onLoadFile = function () {
            $scope.model.results = null;
            $scope.errors = [];
            $('input[type=file]').parse({
                config: ppConfig,
                before: function (file, inputElem) {
                    // executed before parsing each file begins;
                    // what you return here controls the flow
                },
                error: function (err, file, inputElem, reason) {
                    // executed if an error occurs while loading the file,
                    // or if before callback aborted for some reason. (note this is
                    // separate from a parsing error)
                    console.log(err);
                    $scope.errors.push(err + ' ' + file + ' ' + reason);
                    $scope.$apply();
                },
                complete: function () {
                    // executed after all files are complete
                }
            });
        };

        $scope.onOK = function () {
            if ($scope.model.results) {
                $scope.onSave();
            }
            $scope.model.convertingGeoJSON = true;
            generateGeoJson();
            generateTraitJson();
            $uibModalInstance.close();
        };

        $scope.onCancel = function () {
            $uibModalInstance.close(null);
        };

        $scope.onRemoveDataSet = function (name) {
            delete $localStorage.userData[name];
        };

        $scope.onExample = function () {
            $scope.model.showWelcome = false;
            $scope.model.showExample = true;
            $scope.model.dataSetName = 'example.csv';
            var url = STATIC_PATH + 'grin_app/example-user-data.csv';
            $http.get(url).then(function (result) {
                $scope.model.exampleCSV = result.data;
                Papa.parse(result.data, ppConfig);
            });
        };

        $scope.onValidateDataSetName = function() {
            return ( ! $localStorage.userData[$scope.model.dataSetName] );
        };

        $scope.onSave = function () {
            var setName = $scope.model.dataSetName;
            $localStorage.userData[setName] = $scope.model.results;
            $scope.model.results = null;
            $scope.model.file = null;
            $scope.model.dataSetName = null;
            $scope.errors = [];
            $scope.warnings = [];
        };

        function generateTraitJson() {
            // iterate the userData collections, build one json collection.
            // The geoJsonService will look for it there
        }
        function generateGeoJson() {
            // iterate the userData collections, build one geojson collection
            // and put it in localStorage. The geoJsonService will look for it
            // there.
            var geoJson = [];
            _.each($localStorage.userData, function(dataSet) {
                _.each(dataSet.data, function(rec) {
                    var o = {
                        geometry: {
                            type: 'Point',
                            coordinates: [
                                rec.longitude,
                                rec.latitude
                            ]
                        },
                        properties: {
                            accenumb : rec.accession_id,
                            gid: Math.random().toString(16).substr(2,8),
                            acqdate: rec.acqdate,
                            colldate: rec.colldate,
                            collsite: rec.collsite,
                            color: rec.color,
                            cropname: rec.cropname,
                            elevation: rec.elevation,
                            origcty: rec.origcty,
                            taxon: rec.taxon
                        }
                    };
                    geoJson.push(o);
                });
            });
            $localStorage.userGeoJson = geoJson;
        }

        /* uniquify the errors from papaparse, then display in errors array */
        function displayPapaParseErrors(errors) {
            var uniqErrors = _.uniqBy(errors, function (e) {
                return e.code;
            });
            _.each(uniqErrors, function (e) {
                console.log(e);
                var msg = e.message + ' (row: ' + e.row + ')';
                $scope.errors.push(msg);
            });
            $scope.$apply();
        }

        function onParseComplete(results, file) {
            // the parsing may complete inside or outside of the angular digest
            // cycle, always use timeout here.
            $timeout(function() {
                // results has data, errors, and meta properties. inspect to see
                // if there were any errors.
                if (results.errors.length) {
                    displayPapaParseErrors(results.errors);
                    return;
                }
                if (results.meta.fields.indexOf('accession_id') === -1) {
                    $scope.errors.push('missing required header: accession_id');
                }
                if ($scope.errors.length) {
                    $scope.$apply();
                    return;
                }
                $scope.model.results = results;
                if (file) {
                    $scope.model.file = file;
                    $scope.model.dataSetName = file.name;
                }
            });
        }

    });
