var colonyOptionsModule = angular.module('optionsColony',[]);

//This controller is for the accordian style options dropdown
colonyOptionsModule.controller("optionController", ['$scope', function($scope) {

    $scope.status = {
      isFirstOpen: true,
      isFirstDisabled: false
    };

    //$scope.event_sample = function() {
    //    $scope.$emit('sampleRequested');
    //};
}]);

//This controller is for option section for searching a mouse id.
colonyOptionsModule.controller("searchMouseController", ['$scope', function(scope) {

    scope.mouseId = "";
}]);

colonyOptionsModule.directive('colonyoptions', function() {
    return {
        restrict: 'E',
        templateUrl: 'colony-options.html',
        replace: true
    };
});

colonyOptionsModule.directive('optionButton', [function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.bind("click", function() {
            });
        }
    };
}]);
