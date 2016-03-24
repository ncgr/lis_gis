"use strict";
/*
 * filterController; search settings and user controls
 */

app.controller('filterController',
    function ($scope, $state, $http, $location, $uibModal, geoJsonService) {
        
        $scope.init = function () {
            var params = geoJsonService.getSearchParams();
            $scope.model = {
                geoJson: geoJsonService,
                countries: [],
                searchOptions: false,
                autofocusField: null,
                alert: null,
                $location: $location,
                limitToMapExtent: parseBool(params.limitToMapExtent),
                maxRecs: params.maxRecs,
                country: params.country,
                taxonQuery: params.taxonQuery,
                accessionIds: params.accessionIds,
                accessionIdsColor: params.accessionIdsColor,
                accessionIdsInclusive: parseBool(params.accessionIdsInclusive),
                traitOverlay: params.traitOverlay,
                traitScale: params.traitScale,
                traitExcludeUnchar: parseBool(params.traitExcludeUnchar)
            };
            $http.get(API_PATH + '/countries').then(function (resp) {
                // success callback
                $scope.model.countries = resp.data;
            }, function (resp) {
                // error callback
                console.log(resp);
            });
            // fetch the list of traits for this taxon query
            if ($scope.model.taxonQuery) {
                $scope.onTaxonQuery($scope.model.taxonQuery);
            }
        };

        $scope.onOK = function () {
            // user hit OK in the search parameters panel, or search is being
            // updated programmatically: update geojson service with all
            // search params, then do search.
            $scope.model.autofocusField = null;
            $scope.model.alert = null;
            $scope.model.searchOptions = false;
            geoJsonService.setGeocodedAccessionsOnly($scope.model.country !== null, false);
            geoJsonService.setMaxRecs($scope.model.maxRecs, false);
            geoJsonService.setLimitToMapExtent($scope.model.limitToMapExtent, false);
            geoJsonService.setTaxonQuery($scope.model.taxonQuery, false);
            geoJsonService.setCountry($scope.model.country, false);
            geoJsonService.setAccessionIds($scope.model.accessionIds, false);
            geoJsonService.setAccessionIdsColor($scope.model.accessionIdsColor, false);
            geoJsonService.setAccessionIdsInclusive($scope.model.accessionIdsInclusive, false);
            geoJsonService.setTraitOverlay($scope.model.traitOverlay, false);
            geoJsonService.setTraitScale($scope.model.traitScale, false);
            geoJsonService.setTraitExcludeUnchar($scope.model.traitExcludeUnchar, false);
            geoJsonService.search();
        };

        $scope.onRemoveMaxResults = function () {
            $scope.model.autofocusField = 'maxRecs';
            $scope.model.searchOptions = true;
            $scope.model.alert = 'Max results: You can set the limit of search results, ' +
                ' but cannot remove the limit.';
        };

        $scope.onCountry = function (country) {
            if (country) {
                $scope.model.limitToMapExtent = false;
                geoJsonService.setGeocodedAccessionsOnly(true, false);
                geoJsonService.setLimitToMapExtent(false, false);
            }
        };

        $scope.onTaxonQuery = function (taxon) {
            // taxon query field was typed or updated. filter the trait
            // descriptors to match
            if (!taxon || taxon.length < 3) {
                return;
            }
            $scope.model.traitDescriptors = null;
            var oldTrait = $scope.model.traitOverlay;
            $http({
                url: API_PATH + '/evaluation_descr_names',
                method: 'GET',
                params: {
                    'taxon': taxon
                }
            }).then(
                function (resp) {
                    // success handler
                    $scope.model.traitDescriptors = resp.data;
                    if (oldTrait in $scope.model.traitDescriptors) {
                        $scope.model.traitOverlay = oldTrait;
                    }
                },
                function (resp) {
                    // error handler
                    console.log(resp);
                }
            );
        };

        $scope.onExampleAccessions = function () {
            $scope.model.limitToMapExtent = false;
            $scope.model.country = null;
            $scope.model.taxonQuery = null;
            $scope.model.accessionIds = null;
            $scope.model.traitOverlay = null;

            var url = STATIC_PATH + '/grin_app/js/example-accession-ids.json';
            $http.get(url).then(function (resp) {
                // success callback
                var ids = resp.data;
                $scope.model.accessionIds = ids.join(',');
            }, function (resp) {
                // error callback
                console.log(resp);
            });

        };

        $scope.onTraitOverlayExample = function () {
            $scope.model.limitToMapExtent = false;
            $scope.model.country = null;
            $scope.model.accessionIds = null;
            $scope.model.traitOverlay = 'SEEDWGT';
            $scope.model.taxonQuery = 'Phaseolus vulgaris';
            $scope.model.traitScale = 'local';
            $scope.onTaxonQuery($scope.model.taxonQuery);
        };

        $scope.onTraitOverlayOptions = function () {
            var modal = $uibModal.open({
                animation: true,
                templateUrl: 'trait-overlay-options.html',
                controller: 'traitOverlayOptionsController',
                size: 'lg',
                resolve: {
                    model: function () {
                        return {
                            traitOverlay: $scope.model.traitOverlay,
                            traitScale: $scope.model.traitScale,
                            traitExcludeUnchar: $scope.model.traitExcludeUnchar
                        }
                    }
                }
            });
            modal.result.then(function (result) {
                if (!result) {
                    return;
                }
                /* cancelled */
                $scope.model.traitScale = result.traitScale;
                $scope.model.traitExcludeUnchar = result.traitExcludeUnchar;
            }, function () {
                // modal otherwise dismissed callback (ignore result) e.g. backdrop click
            });
        };

        // get a short label for displaying in the current-search-filters area
        $scope.accessionIdsDescr = function () {
            var idsStr = geoJsonService.getSearchParams().accessionIds;
            if (!idsStr) {
                return null;
            }
            var ids = idsStr.split(',');
            if (ids.length > 5) {
                return '(' + ids.length + ' accession IDs)';
            }
            return idsStr;
        };

        $scope.onAccessionIdOptions = function () {
            var modal = $uibModal.open({
                animation: true,
                templateUrl: 'accession-search-options.html',
                controller: 'accessionSearchOptionsController',
                size: 'lg',
                resolve: {
                    model: function () {
                        return {
                            accessionIds: $scope.model.accessionIds,
                            accessionIdsColor: $scope.model.accessionIdsColor,
                            accessionIdsInclusive: $scope.model.accessionIdsInclusive,
                            brewerColors: chroma.brewer.Set1.concat(
                                chroma.brewer.Set2,
                                chroma.brewer.Set3)
                        }
                    }
                }
            });
            modal.result.then(function (result) {
                if (!result) {
                    return;
                }
                /* cancelled */
                $scope.model.accessionIds = result.accessionIds;
                $scope.model.accessionIdsColor = result.accessionIdsColor;
                $scope.model.accessionIdsInclusive = result.accessionIdsInclusive;
            }, function () {
                // modal otherwise dismissed callback (ignore result) e.g. backdrop click
            });
        };

        $scope.onExampleTaxonQuery = function () {
            $scope.model.taxonQuery = 'Arachis hypogaea';
            $scope.model.limitToMapExtent = false;
            $scope.model.country = null;
            $scope.model.accessionIds = null;
            $scope.model.traitOverlay = null;
            $scope.onTaxonQuery($scope.model.taxonQuery);
        };

        $scope.init();

    });
