//File: cove-module.js
//Purpose: Used with the Angular framework to initialize and
//         associate logic with DOM display and interaction.

var coveModule = angular.module('coveApp', ["ngRoute", "ui.bootstrap", "optionsColony", "colonyPlot"]);

//coveModule.config( function($routeProvider) {
//    $routeProvider
//        .when("/colony", {templateUrl: "views/colony.html"})
//        .when("/stats", {templateUrl: "views/stats.html"});
//});

//Initialization
coveModule.controller("menuController", ['$scope', '$location', function($scope, $location) {
    
    var set_selected_view = function() {
        $scope.selectedView = $location.url();
        if (!$scope.selectedView) {
            $scope.selectedView = "/colony";
        }
    };

    $scope.$on( '$locationChangeSuccess', set_selected_view );
}]);

