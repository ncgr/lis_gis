"use strict";
/*
 * accessionDetailController; for modal dialog displaying all known
 * details about an accession and it's trait evaluation records.
 */

//TODO: fix this so it degrades gracefully with user-provided data (currently stalls out with ajax spinner!

app.controller('accessionDetailController',
    function ($scope, $uibModalInstance, $http, accId) {

        $scope.accId = accId;

        $scope.model = {
            accId: accId,
            acc: null,
            evaluation: null,
            hideLISSpeciesLink: true,
            STATIC_PATH: STATIC_PATH,
            BRANDING: BRANDING
        };

        $scope.init = function () {
            $http({
                url: API_PATH + '/accession_detail',
                method: 'GET',
                params: { accessionNumber: $scope.accId, v: new Date().getTime() }
            }).then(function (resp) {
                // success callback
                $scope.model.acc = resp.data[0];
                checkLISSpeciesPage();
            });
            $http({
                url: API_PATH + '/evaluation_detail',
                method: 'GET',
                params: {accessionNumber: $scope.accId, v: new Date().getTime() }
            }).then(function (resp) {
                // success callback
                $scope.model.evaluation = resp.data;
            });
        };

        $scope.onOK = function () {
            // user hit ok button
            $uibModalInstance.close({choice: 'ok'});
        };

        $scope.onGoMap = function () {
            // user hit view on map button
            $uibModalInstance.close({
                choice: 'go-internal-map',
                accDetail: $scope.model.acc
            });
        };

        $scope.onGoLISTaxon = function () {
            // user View taxon at LIS button
            $uibModalInstance.close({
                choice: 'go-external-lis-taxon',
                accDetail: $scope.model.acc
            });
        };

        $scope.onGoLISGRIN = function () {
            // user hit search USDA GRIN button
            $uibModalInstance.close({
                choice: 'go-external-lis-grin',
                accDetail: $scope.model.acc
            });
        };

        function checkLISSpeciesPage() {
            /* attempt check whether there is actually a taxon page at
             * lis matching, e.g. http://legumeinfo.org/organism/Cajanus/cajan
             * note: this may fail from other hosts outside of production,
             * because of 'Access-Control-Allow-Origin' header. */
            var acc = $scope.model.acc.properties;
            // FIXME: update to reference new legumeinfo.org site?
            // CORS issues with legacy.legumeinfo.org site; just always display a link for now.
            // This code will have to change anyway.
//          $http({url: lisURL, method: 'HEAD'}).then(function (resp) {
                // success callback
                $scope.model.hideLISSpeciesLink = false;
//          }, function (resp) {
                // error callback
//              $scope.model.hideLISSpeciesLink = true;
//          });
        }

        $scope.init();
    });
