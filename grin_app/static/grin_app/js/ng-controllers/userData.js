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

 HTTP file loading requires CORS header Access-Control-Allow-Origin to be
 returned by the remote web server. This is a core security restriction of web
 browsers and javascript- and there is no way around it. See
 scripts/test_cors_httpserver.py for a simple test case of HTTP loading of user
 provided data.

 */

app.controller('userDataController',
    function ($scope, $rootScope, $localStorage, $uibModalInstance, $http,
              $timeout, model, geoJsonService) {

        /* ppErrorHandler() : papa parse error callback. */
        function ppErrorHandler(evt) {
            console.log(evt);
            $timeout(function() {
                var msg = evt + '. Unable to load URL: '+ $scope.model.fileURL +
                    '. Please check your web browser\'s Javascript ' +
                    'console for further detail. Please note: ' +
                    'cross-origin requests require ' +
                    'Access-Control-Allow-Origin header from server.';
               $scope.errors = [msg];
            });
        }

        var that = this;

        var ppConfig = {
            header: true,
            encoding: 'utf-8',
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: onParseComplete,
            error: ppErrorHandler,
        };

        $scope.model = model;
        $scope.model.showWelcome = true;
        $scope.model.fileMethod = 'local'; // 'local' or 'url'
        $scope.model.results = null; // results from parsing delimited data
        $scope.model.sortedHeaders = [];
        $scope.model.sets = null;
        $scope.model.previewLimit = 5;
        $scope.model.localStorage = $localStorage;
        $scope.model.converting = false;

        // the user's csv->json original data
        $localStorage.userData = $localStorage.userData || {};
        $localStorage.userGeoJson = $localStorage.userGeoJson || [];
        $localStorage.userTraitData = $localStorage.userTraitData || [];

        if (!Papa) {
            throw('PapaParse javascript library is required.');
        }

        $scope.onLoadURL = function() {
            $scope.model.results = null;
            $scope.errors = [];
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
            var url = STATIC_PATH + 'grin_app/example-user-data.txt';
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
            if(_.isEmpty(setName)) {
                setName = 'my data';
            }
            $localStorage.userData[setName] = $scope.model.results;
            $scope.model.results = null;
            $scope.model.file = null;
            $scope.model.dataSetName = null;
            $scope.errors = [];
            $scope.warnings = [];
        };

        $scope.onOK = function () {
            if ($scope.model.results) {
                $scope.onSave();
            }
            $scope.model.converting = true;
            generateGeoJson();
            generateTraitJson();
            updateSearchAccessionIds();
            updateSearchTaxon();
            updateSearchTrait();
            $scope.model.converting = false;
            geoJsonService.search();
            $scope.errors = [];
            $uibModalInstance.close(true);
        };

        /* updateSearchAccessionIds() : assist the user by filling in the
        * search model with the distinct set of accession ids in the user
        * provided data sets. Overwrite any existing accession ids. */
        function updateSearchAccessionIds() {
            var userData = $localStorage.userGeoJson;
            var accIds = _.uniq(_.map(userData, function (o) {
                return o.properties.accenumb;
            }));
            accIds = _.filter(accIds, function(s) {
                return ! _.isEmpty(s);
            });
            if(accIds.length === 1) {
                geoJsonService.setAccessionIds(accIds[0], false);
            }
            else if(accIds.length > 1) {
                geoJsonService.setAccessionIds(accIds.join(','), false);                
            }
            else {
                geoJsonService.setAccessionIds(null, false);
            }
        }

        /* getUserTraitDescriptors() :  a helper fn to get the unique set of
        * non-empty trait descriptors. */
        function getUserTraitDescriptors() {
            var traitData = $localStorage.userTraitData;
            var res = _.uniq(_.map(traitData, function(o) {
                return o.descriptor_name;
            }));
            res = _.filter(res, function(s) {
               return ! _.isEmpty(s);
            });
            return res;
        }

        /* updateSearchTaxon() : assist the user by filling in the search model
         * with a taxon from their data sets. If the taxon already is in the
         * search model, then check it's validity. */
        function updateSearchTaxon() {
            var userData = $localStorage.userGeoJson;
            var taxa = _.uniq(_.map(userData, function(o) {
                return o.properties.taxon;
            }));
            taxa = _.filter(taxa, function(s) { // filter empties
              return ! _.isEmpty(s);
            });
            if(_.isEmpty(taxa)) {
                 // it's possible user specified some GRIN accession ids, but
                 // not the taxon. The geoJsonService will have to set the
                 // taxonQuery after fetching the accession Ids. Early out for
                 // this edge case here.                 
                var descrs = getUserTraitDescriptors();
                if(! _.isEmpty(descrs)) {
                    geoJsonService.bootSearchTaxonForTraitDescriptor = descrs[0];
                }
                return;
            }
            var params = geoJsonService.params;
            if(! _.includes(taxa, params.taxonQuery)) {
                geoJsonService.setTaxonQuery(taxa[0], false);
            }
        }

        /* updateSearchTrait() : assist the user by filling in the search model
         * with a trait descriptor_name from their data sets. If the trait is
         * already in the search model, then check it's validity. */
        function updateSearchTrait() {
            var descrs = getUserTraitDescriptors();
            if(_.isEmpty(descrs)) {
                // it's possible user did not provide trait data- they are not
                // required.
                geoJsonService.setTraitOverlay(null, false)
                return;
            }
            var params = geoJsonService.params;
            if(! _.includes(descrs, params.traitOverlay)){
                geoJsonService.setTraitOverlay(descrs[0], false);
            }
        }

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
                            coordinates: null
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
                    if(rec.longitude) {
                        o.geometry.coordinates =  [
                                rec.longitude,
                                rec.latitude
                        ];
                    }
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
                    return;
                }
                $scope.model.results = results;
                $scope.model.sortedHeaders = getHeaders();
                if (file) {
                    $scope.model.file = file;
                    $scope.model.dataSetName = file.name;
                }
                else if(! _.isEmpty($scope.model.fileURL)) {
                    var url = $scope.model.fileURL;
                    var path = url.split('/').pop();
                    $scope.model.dataSetName = path;
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
        }
    });
