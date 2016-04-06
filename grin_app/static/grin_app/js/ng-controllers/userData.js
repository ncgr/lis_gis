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
    function ($scope, $rootScope, $localStorage, $uibModalInstance, $http,
              $timeout, model, geoJsonService) {

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
        $scope.model.sortedHeaders = [];
        $scope.model.sets = null;
        $scope.model.previewLimit = 5;
        $scope.model.localStorage = $localStorage;
        $scope.model.convertingGeoJSON = false;

        // the user's csv->json original data
        $localStorage.userData = $localStorage.userData || {};
        $localStorage.userGeoJson = $localStorage.userGeoJson || [];
        $localStorage.userTraitData = $localStorage.userTraitData || [];

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
            $scope.model.convertingGeoJSON = false;
            var userData = $localStorage.userGeoJson;
            var accIds = _.uniq(_.map(userData, function (d) {
                return d.properties.accenumb;
            }));
            geoJsonService.setAccessionIds(accIds.join(','), true);
            $uibModalInstance.close(true);
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
            // iterate the userData collections, build an array of
            // {accenumb, descriptor_name, observation_value} properties.
            var traits = [];
            var userData = $localStorage.userData;
            _.each(userData, function(dataSet, setName) {
                var data = dataSet.data;
                _.each(data, function(rec) {
                    if(rec.trait_observation_value) {
                         var data = {
                               accenumb: rec.accession_id,
                               descriptor_name: rec.trait_descriptor,
                               sub_descriptor_name: rec.trait_sub_descriptor,
                               observation_value: rec.trait_observation_value,
                               is_nominal: rec.trait_is_nominal,
                               data_set: setName
                         };
                         traits.push(data);
                    }
                });
            });
            $localStorage.userTraitData = traits;
        }

        function generateGeoJson() {
            // iterate the userData collections, build one geojson collection
            // and put it in localStorage, where geoJsonService will find it.
            var geoJson = [];
            // uniquify the geoJson by accession number, in case multiple
            // records were provided for the purposes of traits and observations
            var userData = $localStorage.userData;
            _.each(userData, function(dataSet, setName) {
                var data = dataSet.data;
                var uniqAccessions = _.uniqBy(data, function(d) {
                    return d.accession_id;
                });
                _.each(uniqAccessions, function(rec) {
                    var o = {
                        geometry: {
                            type: 'Point',
                            coordinates: [
                                rec.longitude,
                                rec.latitude
                            ]
                        },
                        type : 'Feature',
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
            // cycle, so always use $timeout here.
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
                $scope.model.sortedHeaders = getHeaders();
                if (file) {
                    $scope.model.file = file;
                    $scope.model.dataSetName = file.name;
                }
            });
        }

        /* getHeaders(): return the headers, from model.results. Sort
         * alphabetically, with all 'trait_*' headers after. */
        function getHeaders() {
            if(! $scope.model.results) {
                return;
            }
            var headers = $scope.model.results.meta.fields;
            headers.sort(function(s1,s2) {
                var s1IsTrait = (s1.indexOf('trait_') === 0);
                var s2IsTrait = (s2.indexOf('trait_') === 0);
                if(s1IsTrait && s2IsTrait) { return s1.localeCompare(s2); }
                if(! s1IsTrait && ! s2IsTrait) { return s1.localeCompare(s2); }
                if( s1IsTrait && ! s2IsTrait) { return 1; }
                if(! s1IsTrait && s2IsTrait ) { return -1; }
                return 0;
            });
            return headers;
        };

    });
