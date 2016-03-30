'use strict';

/* instantiate ng-app 'grin' */

var app = angular.module('grin',
    ['ngSanitize',
        'ngStorage',
        'mp.autoFocus',
        'ui.bootstrap',
        'ui.router']);

app.config(function ($httpProvider, $stateProvider) {

    $stateProvider
        .state('search', {
            reloadOnSearch: true,
            views: {
                'errors': {
                    templateUrl: STATIC_PATH + 'grin_app/partials/errors.html',
                    controller: 'errorsController'
                },
                'filter': {
                    templateUrl: STATIC_PATH + 'grin_app/partials/search-filter.html',
                    controller: 'filterController'
                },
                'list': {
                    templateUrl: STATIC_PATH + 'grin_app/partials/search-list.html',
                    controller: 'listController'
                },
                'map': {
                    templateUrl: STATIC_PATH + 'grin_app/partials/search-map.html',
                    controller: 'mapController'
                }
            }
        });

    function httpErrorInterceptor($q, $rootScope) {

        $rootScope.errors = [];
        $rootScope.warnings = [];

        function requestError(rejection) {
            console.log('requestError:');
            console.log(rejection);
            return ($q.reject(rejection));  // pass-through the rejection.
        }

        function responseError(response) {
            var msg = null;
            console.log('responseError:');
            console.log(response);
            switch (response.status) {
                case 0:
                    msg = 'Lost connection to web app. Please check your ' +
                        'network connection, or try again later.';
                    break;
                case -1:
                    msg = 'Lost connection to web app. Please check your ' +
                        'network connection, or try again later.';
                    break;
                case 404:
                    // allow 404 not found, if the accession detail controller
                    // does an HTTP HEAD to check for validity of link-out.
                    if (response.config.url.indexOf('organism/') === -1) {
                        msg = response.status + ' ' +
                            response.statusText + ' ' +
                            response.config.url + ' ' +
                            response.data;
                    }
                    break;
                case 500:
                    msg = response.status + ' ' +
                        response.statusText + ' ' +
                        response.config.url + ' ' +
                        response.data;
                    break;
            }
            if (msg) {
                $rootScope.errors.push(msg);
                console.log($rootScope.errors);
            }
            return ($q.reject(response)); // pass-through the response
        }

        return ({
            requestError: requestError,
            responseError: responseError
        });
    }

    $httpProvider.interceptors.push(httpErrorInterceptor);
    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';

});

app.filter('highlight', function ($sce) {
    return function (text, phrase) {
        var t = text;
        if (phrase) {
            t = t.replace(new RegExp('(' + phrase + ')', 'gi'),
                '<span class="hilite-text">$1</span>');
        }
        return $sce.trustAsHtml(t);
    }
});

app.filter('isEmpty', [function () {
    return function (object) {
        return angular.equals({}, object);
    }
}]);

app.run(function ($state) {
    $state.transitionTo('search');
});

var tourId = 'lis-germplasm-mapper-tour';

app.run(function (geoJsonService, $timeout, $rootScope) {
    /* after the ui and search results have finished loading, start the
     * hopscotch tour. the tour needs to bind to dom elements by id, so
     * it cannot be started before angular compiles the html */
    var handler;

    if (!Cookies.get(tourId)) {
        // have not seen the tour yet, so
        handler = geoJsonService.subscribe($rootScope, 'updated', function () {
            // setup a handler for when the map has data loaded
            $timeout(app.tour, 500);
            handler(); // unsubscribe the handler
        });
    }
});

app.tour = function () {
    var tour = {
        id: tourId,
        showPrevButton: true,
        steps: [
            {
                title: 'Welcome',
                content: 'This is a short tour of the ' + BRANDING.site_heading +
                ' Germplasm map viewer. This web app offers searching and \
                     visualization of germplasm accessions and trait observations.',
                target: 'tour-start',
                placement: 'top'
            },
            {
                title: 'Map Frame',
                content: 'You can drag the map to pan the extent, and use your \
         mouse-wheel to zoom in and out, or use the \
         <span class="glyphicon glyphicon-plus"></span> / \
         <span class="glyphicon glyphicon-minus"></span> zoom buttons \
         (The same as google maps and many other web maps). Try it!',
                target: 'map',
                placement: 'bottom'
            },
            {
                title: 'Map Markers',
                content: 'Click on a circular map marker to select this accession and \
         get more details. Try it! (take care to click, not drag). Map markers \
         are colored by genus, and within each genus the hue is darker or \
         lighter for the various species.',
                target: 'map',
                placement: 'bottom'
            },
            {
                title: 'Results Table',
                content: 'The accessions shown here are automatically synced with the \
         search results, and with the map frame.',
                target: 'results-list',
                placement: 'top'
            },
            {
                title: 'Accession Id Buttons',
                content: 'Click on an accession id to get more details, including \
         links out to search other resources. Try it!',
                target: 'tour-accession-btn',
                placement: 'top'
            },
            {
                title: 'Locator Buttons',
                content: 'Click on the \
         <span class="glyphicon glyphicon-map-marker"></span> \
         location icon to select, center and reveal this accession on the map.\
          Try it!',
                target: 'tour-coords-btn',
                placement: 'top'
            },
            {
                title: 'Set Search Parameters',
                content: 'Click on the Search button to reveal search settings. \
         The Taxon Search may be plain text or use logical \
         AND (&amp;) and OR (|) operators. For example <br/> \
         <code>Arachis hypogaea</code> or <br/>\
         <code>sylvestris | burchellii</code> or <br/>\
         <code>medicago &amp; brevispina</code>.\
         You may click OK to close the search parameters panel.',
                target: 'tour-start',
                placement: 'top',
                onShow: function () {
                    setTimeout(function () {
                        angular.element('#search-btn').trigger('click');
                    }, 0);
                }
            },
            {
                title: 'Your Search Filters',
                content: 'Your current search filters are always listed here. You can \
         click the  <span class="glyphicon glyphicon-remove"></span> to \
         remove any filter. Your map view and results listing are updated \
         automatically. Try it!',
                target: 'current-search-filters',
                placement: 'top'
            },
            {
                title: 'Reframe map',
                content: 'If you want to zoom in on the current list of accessions, \
          use this button.',
                target: 'reframe-btn',
                placement: 'bottom'
            },
            {
                title: 'Change Base Map',
                content: 'You can adjust the base map for a different appearance, if \
         desired. This does not effect your search results!',
                target: 'change-base-map-btn',
                placement: 'bottom'
            },
            {
                title: 'Geographic Coordinates',
                content: 'Click this button to view the current center of the map in \
         latitude and longitude. Or enter new coordinates to go there. \
         Remember: the search results are updated automatically.',
                target: 'enter-coords-btn',
                placement: 'bottom'
            },
            {
                title: 'Geolocate',
                content: 'Click this button to go to your current geolocation (note: \
         you may be prompted to allow this request by your browser). \
         Remember: the search results are updated automatically.',
                target: 'geolocate-btn',
                placement: 'bottom'
            },
            {
                title: 'Map Height',
                content: 'You can adjust the map vertical appearance by using \
                   this tool.',
                target: 'map-height-btn',
                placement: 'bottom'
            }, {
                title: 'Revisit this tour',
                content: 'Click this button anytime to re-open this tour of the web \
         app. Thanks!',
                target: 'tour-btn',
                placement: 'bottom'
            }
        ]
    };

    hopscotch.startTour(tour, 0);
    Cookies.set(tourId, true, {expires: 365});
};

function parseBool(val) {
    return val === true || val === "true";
}
