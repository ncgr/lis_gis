"use strict";

app.service('geoJsonService',
    function ($http, $rootScope, $location, $timeout, $q, $localStorage) {

        var DEFAULT_CENTER = {'lat': 35.87, 'lng': -109.47};
        var MAX_RECS = 200;
        var DEFAULT_ZOOM = 6;
        var MARKER_RADIUS = 8;

        var s = {}; // service/singleton we will construct & return
        s.updating = false;
        s.data = []; // an array of geoJson features
        s.selectedAccession = null; // single accession object currently select.

        s.traitData = []; // an array of json with observation_values
        s.traitHash = {}; // lookup hash for accenumb to array of obs. values
        s.traitMetadata = {};
        s.traitLegend = {}; // all the info for map.js to build a legend

        s.map = null; // the leaflet map, Note: this belongs to
                      // mapController! don't update the map within in this
                      // service.
        s.bounds = L.latLngBounds(L.latLng(0, 0), L.latLng(0, 0));

        // array of event names we are publishing
        s.events = ['updated', 'willUpdate', 'selectedAccessionUpdated'];

        s.init = function () {

            // set default search values on $location service
            s.params = s.getSearchParams();

            if (!('zoom' in s.params)) {
                $location.search('zoom', DEFAULT_ZOOM);
            }
            if (!('maxRecs' in s.params)) {
                $location.search('maxRecs', MAX_RECS);
            }
            if (!('taxonQuery' in s.params)) {
                $location.search('taxonQuery', '');
            }
            if (!('traitOverlay' in s.params)) {
                $location.search('traitOverlay', '');
            }
            if (!('traitScale' in s.params)) {
                $location.search('traitScale', 'global');
            }
            if (!('country' in s.params)) {
                $location.search('country', '');
            }
            if (!('geocodedOnly' in s.params)) {
                $location.search('geocodedOnly', false);
            }
            if (!('traitExcludeUnchar' in s.params)) {
                $location.search('traitExcludeUnchar', false);
            }
            if (!('limitToMapExtent' in s.params) && !('accessionIds' in s.params)) {
                $location.search('limitToMapExtent', true);
            }
            if (!('lng' in s.params)) {
                $location.search('lat', DEFAULT_CENTER.lat);
                $location.search('lng', DEFAULT_CENTER.lng);
            }
            // store updated search params in property of service, for ease of
            // use by controllers and views.
            s.params = s.getSearchParams();
        };

        s.showAllNearbySameTaxon = function () {
            var acc = s.data[0];
            var taxon = acc.properties.taxon;
            s.setAccessionIds(null, false);
            s.setLimitToMapExtent(true, false);
            s.setTaxonQuery(taxon, false);
            s.map.setZoom(DEFAULT_ZOOM);
        };

        s.showAllNearby = function () {
            s.setAccessionIds(null, false);
            s.setLimitToMapExtent(true, false);
            s.setTaxonQuery(null, false);
            s.map.setZoom(DEFAULT_ZOOM);
        };

        s.getBoundsOfGeoJSONPoints = function () {
            var boundsArr = [];
            _.each(s.data, function (d) {
                if (d.geometry.coordinates) {
                    // convert from geojson simple coords to leafletjs simple coords
                    boundsArr.push([d.geometry.coordinates[1],
                        d.geometry.coordinates[0]]);
                }
            });
            return new L.LatLngBounds(boundsArr);
        };

        function postProcessSearch() {
            s.params = s.getSearchParams();

            if($localStorage.userGeoJson) {
                mergeUserGeoJson();
                mergeUserTraitJson();
            }

            s.updateBounds();
            s.updateColors();
            s.updateMarkerStrategy();
            s.updating = false;
            s.setSelectedAccession(s.selectedAccession);
            s.notify('updated');
        }

        s.search = function () {
            $rootScope.errors = [];
            $rootScope.warnings = [];
            s.updating = true;
            s.data = [];
            s.traitData = [];
            s.traitHash = {};
            s.params = s.getSearchParams();

            $http({
                url: API_PATH + '/search',
                method: 'POST',
                data: {
                    taxon_query: s.params.taxonQuery,
                    ne_lat: s.bounds._northEast.lat,
                    ne_lng: s.bounds._northEast.lng,
                    sw_lat: s.bounds._southWest.lat,
                    sw_lng: s.bounds._southWest.lng,
                    limit_geo_bounds: parseBool(s.params.limitToMapExtent),
                    geocoded_only: s.params.geocodedOnly,
                    country: s.params.country,
                    accession_ids: s.params.accessionIds,
                    accession_ids_inclusive: parseBool(s.params.accessionIdsInclusive),
                    trait_overlay: s.params.traitOverlay,
                    limit: s.params.maxRecs
                }
            }).then(
                function (resp) {
                    // success handler;
                    s.data = resp.data;
                    if (s.data.length === 0 && s.params.geocodedOnly) {
                        /* retry search with geocodedOnly off (to support edge case
                         e.g. when searching by some countries which only have
                         non-geographic accessions. */
                        s.setGeocodedAccessionsOnly(false, true);
                        return;
                    }
                    if (s.params.taxonQuery && s.params.traitOverlay && s.data.length > 0) {
                        var promise1 = $http({
                            url: API_PATH + '/evaluation_search',
                            method: 'POST',
                            data: {
                                accession_ids: s.getAccessionIds(),
                                descriptor_name: s.params.traitOverlay
                            }
                        }).then(
                            function (resp) {
                                // success handler
                                s.traitData = resp.data;
                            },
                            function (resp) {
                                // error handler
                                console.log(resp);
                            }
                        );
                        var promise2 = $http({
                            url: API_PATH + '/evaluation_metadata',
                            method: 'POST',
                            data: {
                                taxon: s.params.taxonQuery,
                                descriptor_name: s.params.traitOverlay,
                                accession_ids: (s.params.traitScale === 'local') ? s.getAccessionIds() : [],
                                trait_scale: s.params.traitScale
                            }
                        }).then(
                            function (resp) {
                                // success handler
                                s.traitMetadata = resp.data;
                            },
                            function (resp) {
                                // error handler
                                console.log(resp);
                            }
                        );
                        $q.all([promise1, promise2]).then(postProcessSearch);
                    }
                    else {
                        postProcessSearch();
                    }
                },
                function (resp) {
                    // error handler
                    console.log('Error:');
                    console.log(resp);
                });
        };

        /* return array an of accession ids in the current geojson data set. */
        s.getAccessionIds = function () {
            return _.map(s.data, function (d) {
                return d.properties.accenumb;
            });
        };

        /* return a shallow copy of $location.search() object, merging in
         properties for any local storage params, e.g. accessionIds which
         have overflowed the limit for URL param. */
        s.getSearchParams = function () {
            var params = $location.search(); // get search dictionary (no params)
            // url query string overrides anything in localStorage
            if (params.accessionIds) {
                delete $localStorage.accessionIds;
            }
            var merged = {};
            angular.extend(merged, params);
            if ($localStorage.accessionIds) {
                merged.accessionIds = $localStorage.accessionIds;
            }
            // force some parameters to be booleans ($location.search() has
            // the unfortunate feature of being untyped; depending on how data
            // was set
            if ('limitToMapExtent' in merged) {
                merged.limitToMapExtent = parseBool(merged.limitToMapExtent);
            }
            if ('geocodedOnly' in merged) {
                merged.geocodedOnly = parseBool(merged.geocodedOnly);
            }
            if ('traitExcludeUnchar' in merged) {
                merged.traitExcludeUnchar = parseBool(merged.traitExcludeUnchar);
            }
            if ('zoom' in merged) {
                merged.zoom = parseInt(merged.zoom);
            }
            if ('maxRecs' in merged) {
                merged.maxRecs = parseInt(merged.maxRecs);
            }
            if ('mapHeight' in merged) {
                merged.mapHeight = parseInt(merged.mapHeight);
            }
            return merged;
        };

        /* set one selected accession to hilight in the UI */
        s.setSelectedAccession = function (accId) {
            // early out if accId is null (de-selection)
            if(! accId) {
                var changed = (s.selectedAccession !== null);
                s.selectedAccession = null;
                if (changed) {
                    s.notify('selectedAccessionUpdated');
                }
                return;
            }
            var accession = _.find(s.data, function (d) {
                return (d.properties.accenumb === accId);
            });
            if (!accession) {
                // the accession id is not in the current result set,
                // so forcibly clear the selection.
                accId = null;
            }
            else {
                // splice the record to beginning of geoJson dataset
                var idx = _.indexOf(s.data, accession);
                if (idx !== -1) {
                    s.data.splice(idx, 1);
                    s.data.splice(0, 0, accession);
                }
            }
            var changed = (s.selectedAccession !== accId);
            s.selectedAccession = accId;
            if (changed) {
                s.notify('selectedAccessionUpdated');
            }
        };

        /* set the bounds of map extent, and save to search parameters */
        s.setBounds = function (bounds, doSearch) {
            if (s.bounds.equals(bounds) && s.data.length > 0) {
                // early out if the bounds is already set to same, and we have results
                return;
            }
            s.bounds = bounds;
            $location.search('ne_lat', s.bounds._northEast.lat);
            $location.search('ne_lng', s.bounds._northEast.lng);
            $location.search('sw_lat', s.bounds._southWest.lat);
            $location.search('sw_lng', s.bounds._southWest.lng);
            if (doSearch) {
                s.search();
            }
        };

        /* set a country filter for the search. */
        s.setCountry = function (cty, search) {
            $location.search('country', cty);
            if (search) {
                s.search();
            }
        };

        /* set the max number of records in search results limit. */
        s.setMaxRecs = function (max, search) {
            $location.search('maxRecs', max);
            if (search) {
                s.search();
            }
        };

        /* set whether to limit the search to the current geographic extent. */
        s.setLimitToMapExtent = function (bool, search) {
            $location.search('limitToMapExtent', bool);
            if (search) {
                s.search();
            }
        };

        /* set a taxon query string for full-text search by genus or species. */
        s.setTaxonQuery = function (q, search) {
            $location.search('taxonQuery', q);
            if (search) {
                s.search();
            }
        };

        /* set a list of specific accession ids */
        s.setAccessionIds = function (accessionIds, search) {
            // if there 'too many' accessionIds, it *will* overflow the
            // allowed URL length with search parameters, so use localstorage.
            delete $localStorage.accessionIds;
            $location.search('accessionIds', null);

            if (accessionIds) {
                var ids = accessionIds.split(',');
                if (ids.length <= 10) {
                    // use url query parameter
                    $location.search('accessionIds', accessionIds);
                }
                else {
                    // use local storage api
                    $localStorage.accessionIds = accessionIds;
                }
            }
            s.initialBoundsUpdated = false;
            if (search) {
                s.search();
            }
        };

        /* set a custom color for the user's list of accessionIds */
        s.setAccessionIdsColor = function (color, search) {
            $location.search('accessionIdsColor', color);
            if (search) {
                s.search();
            }
        };

        /* set whether to merge other search results in (true), or display
         results exclusively for this set of accession ids. */
        s.setAccessionIdsInclusive = function (bool, search) {
            $location.search('accessionIdsInclusive', bool);
            if (search) {
                s.search();
            }
        };

        /* set a trait descriptor_name to display for the taxon query. */
        s.setTraitOverlay = function (trait, search) {
            $location.search('traitOverlay', trait);
            if (search) {
                s.search();
            }
        };

        /* set whether to exclude descriptor_name uncharacterized accessions
         from the map display. */
        s.setTraitExcludeUnchar = function (bool, search) {
            $location.search('traitExcludeUnchar', bool);
            if (search) {
                s.search();
            }
        };

        /* set either local or global trait scale, which effects display of
         min/max values for numeric traits. */
        s.setTraitScale = function (scale, search) {
            $location.search('traitScale', scale);
            if (search) {
                s.search();
            }
        };

        /* set whether to limit search results to those having geographic coords. */
        s.setGeocodedAccessionsOnly = function (bool, search) {
            $location.search('geocodedOnly', bool);
            if (search) {
                s.search();
            }
        };

        function customizer(objValue, srcValue) {

        }

        /* mergeUserGeoJson(): make a dict of all accession ids in search
           results, check & merge properties if user geojson is overriding any
           of the accessions.*/
        function mergeUserGeoJson() {
            var addAccessions = {};
            var userAccessions = {};
            var allAccessions = {};
            var customizer = function(destProp, srcProp) {
                // allow sourced properties to override destination properties.
                return _.isUndefined(srcProp) ? destProp : destProp;
            };
            _.each(s.data, function (d) {
                allAccessions[d.properties.accenumb] = d;
            });
            _.each($localStorage.userGeoJson, function (d) {
                var accId = d.properties.accenumb;
                userAccessions[accId] = d;
                if(allAccessions[accId]) {
                    // user has provided this accession, so extend it's props.
                    var src = d.properties;
                    var dst = allAccessions[accId].properties;
                    _.extendWith(dst, src, customizer);
                    if(d.geometry.coordinates.length) {
                        allAccessions[accId].geometry.coordinates =
                            d.geometry.coordinates;
                    }
                }
                else {
                    // mark user's accession to add complete collection
                    addAccessions[accId] = d;
                }
            });
            _.each(addAccessions, function(d, accId) {
                s.data.unshift(d);
            });
        }

        function mergeUserTraitJson() {
            if (!$localStorage.userTraitJson) {
                return;
            }
            // TODO: mergeUserTraitJson
        }

        /* use a custom color scheme with a range of the selected trait
         iterate the trait results once, to build a lookup table */
        function colorStrategyNumericTrait() {
            _.each(s.traitData, function (d) {
                if (s.traitHash[d.accenumb]) {
                    s.traitHash[d.accenumb].push(d.observation_value);
                }
                else {
                    s.traitHash[d.accenumb] = [d.observation_value];
                }
            });
            var min = s.traitMetadata.min;
            var max = s.traitMetadata.max;
            var scale = chroma.scale('Spectral').domain([max, min]);
            _.each(s.data, function (acc) {
                var traitValues = s.traitHash[acc.properties.accenumb];
                if (traitValues !== undefined) {
                    // it is not unusual to have multiple observations, so just
                    // average them-- possible there is a better way to handle this case
                    var avg = _.sum(traitValues, function (d) {
                            return d;
                        }) / traitValues.length;
                    acc.properties.color = scale(avg).hex();
                    acc.properties.haveTrait = true;
                } else {
                    acc.properties.color = taxonChroma.defaultColor;
                }
            });
            var steps = 10;
            var step = (max - min) / steps;
            var legendValues = _.map(_.range(min, max + step, step), function (n) {
                return {
                    label: n.toFixed(2),
                    color: scale(n).hex()
                }
            });
            s.traitLegend = {
                min: min,
                max: max,
                colorScale: scale,
                values: legendValues
            };
        }

        function colorStrategyCategoryTrait() {

            _.each(s.traitData, function (d) {
                if (s.traitHash[d.accenumb]) {
                    s.traitHash[d.accenumb].push(d.observation_value);
                }
                else {
                    s.traitHash[d.accenumb] = [d.observation_value];
                }
            });

            _.each(s.data, function (d) {
                var traitValues = s.traitHash[d.properties.accenumb];
                if (traitValues !== undefined) {
                    // unsure how to handle case where multiple categories were
                    // observed, so just take the 1st
                    var val = traitValues[0];
                    d.properties.color = s.traitMetadata.colors[val];
                    d.properties.haveTrait = true;
                }
                else {
                    d.properties.color = taxonChroma.defaultColor;
                }
            });

            var legendValues = _.map(s.traitMetadata.obs_nominal_values,
                function (n) {
                    return {
                        label: n,
                        color: s.traitMetadata.colors[n]
                    }
                });
            s.traitLegend = {
                min: null,
                max: null,
                colorScale: null,
                values: legendValues
            };
        }


        s.updateColors = function () {
            s.traitHash = {};
            s.traitLegend = {};

            if (s.params.traitOverlay) {
                if (s.traitMetadata.trait_type === 'numeric') {
                    colorStrategyNumericTrait();
                }
                else {
                    colorStrategyCategoryTrait();
                }
            }
            else {
                // use default color scheme from taxonChroma
                _.each(s.data, function (acc) {
                    acc.properties.color = taxonChroma.get(acc.properties.taxon);
                });
            }

            // override all over coloring schems, with accessionIds coloring, if any
            if (s.params.accessionIds && s.params.accessionIdsColor) {
                var accIds = s.params.accessionIds.split(',');
                _.each(s.data, function (acc) {
                    if (accIds.indexOf(acc.properties.accenumb) !== -1) {
                        acc.properties.color = s.params.accessionIdsColor;
                    }
                });
            }
        };

        /*
         * updateMarkerStrategy() Use Leaflet's circleMarker by default. If we
         * are displaying categorical trait data, then draw a pie-chart
         * marker with all the nominal values.
         */
        s.updateMarkerStrategy = function () {
            if (s.params.traitOverlay &&
                s.traitMetadata.trait_type === 'nominal') {
                s.markerCallback = getPieChartMarker;
            }
            else {
                s.markerCallback = getCircleMarker;
            }
        };

        function getCircleMarker(feature, latlng) {
            // get a circle marker and tag it with the accession #.
            var mouseOverLabel = feature.properties.accenumb +
                ' (' + feature.properties.taxon + ')';
            var marker = L.circleMarker(latlng, {
                id: feature.accenumb,
                radius: MARKER_RADIUS,
                fillColor: feature.properties.color,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 1
            });
            marker.bindLabel(mouseOverLabel);
            return marker;
        }

        function getPieChartMarker(feature, latlng) {
            // get a circle marker colored as pie chart, with all of
            var data = s.traitHash[feature.properties.accenumb];
            if (!data) {
                // this accession is uncharacterized, so fall back to circle marker
                return getCircleMarker(feature, latlng);
            }
            // construct data dictionary and chartOptions for leaflet-dvf piechart
            data = _.uniq(data);
            var dataDict = _.keyBy(data, function (d) {
                return d;
            });
            var degreesPerCategory = 360 / data.length;
            dataDict = _.mapValues(dataDict, function () {
                return degreesPerCategory;
            });
            var chartOptionsDict = _.keyBy(data, function (d) {
                return d;
            });
            chartOptionsDict = _.mapValues(chartOptionsDict, function (d) {
                return {
                    fillColor: s.traitMetadata.colors[d],
                    displayText: function () {
                        return feature.properties.accenumb;
                    }
                }
            });
            var options = {
                data: dataDict,
                chartOptions: chartOptionsDict,
                radius: MARKER_RADIUS,
                opacity: 1.0,
                fillOpacity: 1.0,
                gradient: false
            };
            return new L.PieChartMarker(latlng, options);
        }

        s.getAnyGeocodedAccession = function () {
            return _.find(s.data, function (geoJson) {
                if (_.has(geoJson, 'geometry.coordinates.length')) {
                    return true;
                }
            });
        };

        s.initialBoundsUpdated = false;

        s.updateBounds = function () {
            /* in case we are searching by accessionIds, we need to derive new
             * bounds before sending updated event to listeners
             * (e.g. mapController) Use Leafletjs to perform all the bounds
             * calculations and extent fitting. */
            var accessionIds = _.get(s.params, 'accessionIds');
            if (!accessionIds) {
                return;
            }
            if (s.initialBoundsUpdated || s.data.length == 0) {
                return;
            }
            var geocodedAcc = s.getAnyGeocodedAccession();
            if (!geocodedAcc) {
                return;
            }
            var point = L.latLng(geocodedAcc.geometry.coordinates[1],
                geocodedAcc.geometry.coordinates[0]);
            var bounds = L.latLngBounds(point, point);
            _.each(s.data, function (geoJson) {
                if (_.has(geoJson, 'geometry.coordinates.length')) {
                    var point = L.latLng(geoJson.geometry.coordinates[1],
                        geoJson.geometry.coordinates[0]);
                    bounds.extend(point);
                }
            });
            s.bounds = bounds;
            s.initialBoundsUpdated = true;
        };

        /* pub/sub event model adapted from here :
         http://www.codelord.net/2015/05/04/angularjs-notifying-about-changes-from-services-to-controllers/
         */
        s.subscribe = function (scope, eventName, callback) {
            if (!_.includes(s.events, eventName)) {
                throw 'invalid eventName ' + eventName;
            }
            var handler = $rootScope.$on('geoJsonService_' + eventName, callback);
            scope.$on('$destroy', handler);
            return handler;
        };

        s.notify = function (eventName) {
            $rootScope.$emit('geoJsonService_' + eventName);
        };

        s.init();

        return s;
    });
