"use strict";
/*
 * mapController
 */

app.controller('mapController',
    function ($scope, $state, $timeout, $location, $uibModal, $localStorage,
              geoJsonService) {

        var DEFAULT_BASEMAP = geoJsonService.params.baseMap ||
            Cookies.get('baseMap') ||
            'ESRI - NatGeo (default, reference map)';

        /* 350px is the default height used by leafletjs. If another default
         * size is set, it will result in the map size being invlidated and
         * causing an initial reload of the search which is bad UX.
         */
        var DEFAULT_MAP_HEIGHT = function () {
            var dpr = window.devicePixelRatio || 1.0;
            var devIndHeight = window.innerHeight / dpr;
            if (devIndHeight > 700) {
                // this is preferred; use the leafletjs default height, and take
                // up no more than 1/2 of the window height with the map,
                // leaving room for search results.
                return 350;
            }
            // use 1/2 of the remaining device independent pixels. this would
            // be used for example on a phone with very high dpi
            return devIndHeight * 0.5;
        }();

        var mapLayer;
        var currentPopup = null;

        $scope.model = {
            geoJsonService: geoJsonService,
            $location: $location,
            map: null,  // the leaflet map
            geoJsonLayer: null,
            center: {
                lat: geoJsonService.params.lat,
                lng: geoJsonService.params.lng
            },
            geoCoordsSelect: false, // show geocoords selector ui
            baseMapSelect: false,   // show basemap selector ui
            mapHeight: DEFAULT_MAP_HEIGHT,
            mapHeightUndo: DEFAULT_MAP_HEIGHT,
            mapHeightSelect: false, // show map height selector ui
            baseMapLayer: null,
            maxResultsCircle: null,
            countries: [],
            baseMaps: {
                'ESRI - NatGeo (default, reference map)': function () {
                    return L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
                        attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
                        noWrap: true
                    });
                },
                'OpenTopoMap (terrain map)': function () {
                    return L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                        attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
                        noWrap: true
                    });
                },
                'MapQuest (aerial imagery)': function () {
                    return L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/{type}/{z}/{x}/{y}.{ext}', {
                        type: 'sat',
                        ext: 'jpg',
                        attribution: 'Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> &mdash; Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency',
                        subdomains: '1234',
                        noWrap: true
                    });
                }
            }
        };

        $scope.init = function () {

            if (!('mapHeight' in geoJsonService.params)) {
                $location.search('mapHeight', DEFAULT_MAP_HEIGHT);
            } else {
                $scope.model.mapHeight = geoJsonService.params.mapHeight;
            }

            $scope.model.map = L.map('map', {
                'center': [$scope.model.center.lat, $scope.model.center.lng],
                'zoom': geoJsonService.params.zoom
            });

            $scope.model.map.attributionControl.addAttribution(
                'Data: USDA <a href="http://www.ars-grin.gov/npgs/" target="new">GRIN/NPGS</a>');
            geoJsonService.map = $scope.model.map;

            // add the default basemap
            $scope.model.baseMapLayer = $scope.model.baseMaps[DEFAULT_BASEMAP]();
            $scope.model.baseMapLayer.addTo($scope.model.map);
            mapLayer = L.geoJson(geoJsonService.data, {
                pointToLayer: function (feature, layer) {
                    return geoJsonService.markerCallback(feature, layer);
                },
                onEachFeature: function (feature, layer) {
                    // bind a popup to each feature
                    var accId = feature.properties.accenumb;
                    var content = accId + '<br/>' + feature.properties.taxon;
                    var popup = L.popup();
                    popup.accId = accId; // cache the accession number in a property
                    popup.setContent(content);
                    layer.bindPopup(popup);
                    if (accId === geoJsonService.selectedAccession) {
                        // for some reason openPopup won't work immediately
                        // so delay 1 tick
                        $timeout(function () {
                            layer.openPopup();
                        });
                    }
                },
                filter: filterNonGeocoded
            });

            // add a scale bar
            L.control.scale().addTo($scope.model.map);

            // add a north arrow
            var north = L.control({position: "bottomright"});
            north.onAdd = function (map) {
                var div = L.DomUtil.create("div", "info legend");
                div.innerHTML = '<img src="' +
                    STATIC_PATH + 'grin_app/images/north-arrow.png">';
                return div;
            };
            north.addTo($scope.model.map);

            mapLayer.addTo($scope.model.map);
            Cookies.set('baseMap', DEFAULT_BASEMAP);
            $location.search('baseMap', DEFAULT_BASEMAP);

            geoJsonService.subscribe($scope, 'updated', function () {

                // update map and scope.model with any changes in bounds in the
                // bounds, or the center of the geoJsonService
                if (!$scope.model.map.getBounds().equals(geoJsonService.bounds)) {
                    $scope.model.map.fitBounds(geoJsonService.bounds);
                    if ($scope.model.map.getZoom() > 10) {
                        // in case of single geocoded accession, fudge the zoom to something
                        // reasonable
                        $scope.model.map.setZoom(10);
                    }
                }

                // update model so we can display lat/long of map center.
                var mapCenter = $scope.model.map.getCenter();
                $scope.model.center = {
                    lat: mapCenter.lat.toFixed(2),
                    lng: mapCenter.lng.toFixed(2)
                };

                // update url with lat/lng and zoom parameters.
                $location.search('lat', $scope.model.center.lat);
                $location.search('lng', $scope.model.center.lng);
                $location.search('zoom', $scope.model.map.getZoom());

                // remove previous map markers, and then update with the new geojson
                mapLayer.clearLayers();

                var filteredGeoJson = geoJsonService.data;
                if (geoJsonService.params.traitExcludeUnchar &&
                    geoJsonService.params.traitOverlay) {
                    // exclude uncharacterized accessions for this trait
                    filteredGeoJson = _.filter(geoJsonService.data,
                        function (d) {
                            var accId = d.properties.accenumb;
                            return accId in geoJsonService.traitHash;
                        });
                }
                mapLayer.addData(filteredGeoJson);

                if ($scope.model.map.getSize().y != $scope.model.mapHeight) {
                    $scope.model.map.invalidateSize();
                }

                $timeout(addMaxResultsSymbology, 0);
                $timeout(fixMarkerZOrder, 0);
            });

            $scope.model.map.on('moveend', function (e) {
                /* moveend fires at the end of drag and zoom events as well.
                 * don't subscribe to those events because it was causing
                 * multiple queries to be issued for same extent. */

                // timeout to force this to be asynchronous
                $timeout(function () {
                    var mapCenter = $scope.model.map.getCenter();
                    $scope.model.center = {
                        lat: mapCenter.lat.toFixed(2),
                        lng: mapCenter.lng.toFixed(2)
                    };
                    // check if map and geoJsonService differ in extent (e.g. if
                    // user is driving the map)
                    var mapBounds = $scope.model.map.getBounds();
                    if (!mapBounds.equals(geoJsonService.bounds)) {
                        // update geoJsonService to new bounds, and trigger a search.
                        geoJsonService.setBounds(mapBounds, true);
                    }
                }, 0);
            });

            /* manage leaflet popup & associate with selected accession in
             * list view */
            $scope.model.map.on('popupopen', function (e) {

                currentPopup = e.popup; // keep track of current popup
                if(e.popup.ignoreCloseEvt) {
                    return;
                }

                // use timeout to enter ng event digest
                $timeout(function () {
                    var accId = e.popup.accId;
                    // handle the case where popup originates from the user
                    // interacting with leaflet map (clicking on a marker)
                    if (accId && accId !== geoJsonService.selectedAccession) {
                        geoJsonService.setSelectedAccession(accId);
                    }
                });
            });

            $scope.model.map.on('popupclose', function (e) {
                //use timeout to enter ng event digest
                currentPopup = null;
                if(e.popup.ignoreCloseEvt) {
                    delete e.popup.ignoreCloseEvt;
                    return;
                }
                $timeout(function () {
                    var accId = geoJsonService.selectedAccession;
                    if (accId === e.popup.accId) {
                        // the popup was closed, and it matches the selected
                        // accession, so... user wants to dismiss selected acc.
                        // currentPopup = null;
                        geoJsonService.setSelectedAccession(null);
                    }
                });
            });

            geoJsonService.subscribe($scope, 'selectedAccessionUpdated',
                function () {
                    // handle the case where selected accession event is
                    // coming from elsewhere, e.g. the search filter controller.
                    var accId = geoJsonService.selectedAccession;
                    if(! accId) {
                        if(currentPopup) {
                            currentPopup.ignoreCloseEvt = true;
                            $scope.model.map.closePopup(currentPopup);
                            currentPopup = null;
                            return;
                        }
                    }
                    var cp = currentPopup;
                    if(cp && cp.accId === accId) {
                        // don't touch the existing popup if matches selection.
                        return;
                    }
                    mapLayer.eachLayer(function (layer) {
                        if (layer._popup.accId == accId) {
                            if(cp) {
                                cp.ignoreCloseEvt = true;
                            }
                            layer.openPopup(); // will close current popup.
                        }
                    });
                });

            // finally, sync the bounds of the leaflet map with the geojson
            // service (this could trigger a search() so perform it last.
            geoJsonService.setBounds($scope.model.map.getBounds(), true);

        }; // init()


        $scope.onZoomToAccessions = function () {
            var b = geoJsonService.getBoundsOfGeoJSONPoints();
            if (b && '_southWest' in b) {
                geoJsonService.setBounds(b, false);
                $scope.model.map.fitBounds(b);
                if ($scope.model.map.getZoom() > 10) {
                    // in case of single geocoded accession, fudge the zoom to something
                    // reasonable
                    $scope.model.map.setZoom(10);
                }
            }
        };

        $scope.onSelectBaseMap = function (name) {
            var map = $scope.model.map;
            if (map.hasLayer($scope.model.baseMapLayer)) {
                map.removeLayer($scope.model.baseMapLayer);
            }
            var baseMap = $scope.model.baseMaps[name]();
            baseMap.addTo($scope.model.map);
            $scope.model.baseMapLayer = baseMap;
            $scope.model.baseMapSelect = false;
            $location.search('baseMap', name);
            Cookies.set('baseMap', name);
        };

        $scope.onSetCenter = function () {
            // user updated lat/long form values
            $scope.model.map.panTo($scope.model.center);
            $scope.model.geoCoordsSelect = false;
        };

        $scope.onGeoLocate = function () {
            // user hit go to my location button
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    $scope.model.center = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    $scope.model.map.panTo($scope.model.center);
                });
            }
            $scope.model.geoCoordsSelect = false;
        };

        $scope.onMapHeight = function (direction) {
            // user hit map height adjustment button.
            var amount;
            if (direction === '+') {
                amount = window.innerHeight / 20;
            } else {
                amount = -1 * (window.innerHeight / 20);
            }
            var height = $scope.model.mapHeight;
            height += parseInt(amount);

            if (height <= 0) {
                height = parseInt(window.innerHeight / 20);
            }
            else if (height > window.innerHeight) {
                height = window.innerHeight;
            }
            $scope.model.mapHeight = height;
            $location.search('mapHeight', height);
        };

        $scope.onMapHeightCancel = function () {
            // user cancelled the height adjustment
            $scope.model.mapHeightSelect = false;
            $location.search('mapHeight', $scope.model.mapHeightUndo);
            $scope.model.mapHeight = $scope.model.mapHeightUndo;
            $scope.model.map.invalidateSize();
        };

        $scope.onTour = function () {
            app.tour();
        };

        $scope.onUserData = function () {
            var modal = $uibModal.open({
                animation: true,
                templateUrl: STATIC_PATH + 'grin_app/partials/user-data-modal.html',
                controller: 'userDataController',
                size: 'lg',
                resolve: {
                    model: {
                        BRANDING: BRANDING,
                        STATIC_PATH: STATIC_PATH
                    }
                }
            });
            modal.result.then(function () {
                geoJsonService.search();
            }, function () {
                // modal otherwise dismissed callback (ignore result) e.g.
                // backdrop click
            });
        };

        function get2CharAbbrev(feature) {
            var species = feature.properties.taxon.split(' ')[1];
            return species.substring(0, 2);
        }

        function fixMarkerZOrder() {
            // attempt to handle some cases where certain markers need to
            // bubble to top
            if (geoJsonService.params.traitOverlay) {
                $scope.model.map.eachLayer(function (l) {
                    if (_.has(l, 'feature.properties.haveTrait')) {
                        if ('bringToFront' in l) {
                            l.bringToFront();
                        }
                    }
                });
            }
            if (geoJsonService.params.accessionIds) {
                var accIds = geoJsonService.params.accessionIds.split(',');
                $scope.model.map.eachLayer(function (l) {
                    if (accIds.indexOf(_.get(l, 'feature.properties.accenumb')) !== -1) {
                        l.bringToFront();
                    }
                });
            }
        }

        function addMaxResultsSymbology() {
            if ($scope.maxResultsCircle) {
                $scope.model.map.removeLayer($scope.maxResultsCircle);
            }
            if (geoJsonService.data.length !== geoJsonService.params.maxRecs) {
                return;
            }
            var bounds = geoJsonService.getBoundsOfGeoJSONPoints();
            if ($scope.maxResultsCircle) {
                $scope.model.map.removeLayer($scope.maxResultsCircle);
            }
            var sw = bounds.getSouthWest();
            var ne = bounds.getNorthEast();
            if (sw && ne) {
                var meters = sw.distanceTo(ne) * 0.5;
                $scope.maxResultsCircle = L.circle(bounds.getCenter(), meters, {
                    color: 'rgb(245, 231, 158)',
                    fill: false,
                    opacity: 0.75
                }).addTo($scope.model.map);
            }
        }

        $scope.getVisibleMarkerCount = function () {
            var bounds = $scope.model.map.getBounds();
            var ct = 0;
            mapLayer.eachLayer(function (marker) {
                if (bounds.contains(marker.getLatLng())) {
                    ct++;
                }
            });
            return ct;
        };

        /* show an alert if no accessions are visible on the map extent */
        $scope.showHiddenAccHelp = function () {
            if (geoJsonService.updating) {
                return false;
            }
            if (!geoJsonService.data.length) {
                return false;
            }
            if (geoJsonService.params.traitExcludeUnchar) {
                return false;
            }
            if (!geoJsonService.getAnyGeocodedAccession()) {
                return false;
            }
            return ($scope.getVisibleMarkerCount() <= 0);
        };

        /* show an alert if no accessions have geographic coords. */
        $scope.showHiddenAccHelp2 = function () {
            if (geoJsonService.updating) {
                return false;
            }
            if (!geoJsonService.data.length) {
                return false;
            }
            if (geoJsonService.params.traitExcludeUnchar) {
                return false;
            }
            if ($scope.getVisibleMarkerCount() > 0) {
                return false;
            }
            return (!geoJsonService.getAnyGeocodedAccession());
        };

        function filterNonGeocoded(featureData, layer) {
            /* GeoJson spec allows null coordinates (e.g. non-geocoded
             * accessions in our situation). However leafletjs errors on the
             * null coordinates, so filter them out here */
            return (featureData.geometry.coordinates !== null);
        }

        $scope.init();
    });
