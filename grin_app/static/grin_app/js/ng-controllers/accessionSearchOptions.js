"use strict";
/*
 * accessionSearchOptionsController; for modal dialog with search
 * options in the case of specific set of accession ids:
 *
 * - coloring the map markers  
 *
 * - whether to display surrounding results from taxon search or
 *    filter to only these accessions
 *
 */

// TODO: make more reusable for use with "Add my data" and userData.js

app.controller('accessionSearchOptionsController',
    function ($scope, $uibModalInstance, model) {

        $scope.model = model;
        $scope.model.useCustomColor = $scope.model.accessionIdsColor ? true : false;

        $scope.onOK = function () {
            $uibModalInstance.close($scope.model);
        };

        $scope.onCancel = function () {
            $uibModalInstance.close(null);
        };

        $scope.onShowColorSelection = function (useCustomColor) {
            if ($scope.model.accessionIdsColor && !useCustomColor) {
                $scope.model.accessionIdsColor = null;
                return;
            }
            if (useCustomColor && !$scope.model.accessionIdsColor) {
                $scope.model.accessionIdsColor = $scope.model.brewerColors[1];
            }
        };
    });
