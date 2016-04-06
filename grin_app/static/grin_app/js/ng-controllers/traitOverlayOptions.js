"use strict";
/*
 * traitOverlayOptionsController; for modal dialog with options for
 * the case of a seleted observation/trait to be overlayed with the
 * taxon search.
 */

app.controller('traitOverlayOptionsController',
    function ($scope, $uibModalInstance, model) {

        $scope.model = model;

        $scope.onOK = function () {
            $uibModalInstance.close($scope.model);
        };

        $scope.onCancel = function () {
            $uibModalInstance.close(null);
        };

    });
