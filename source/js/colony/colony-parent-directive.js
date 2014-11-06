//File: colony-parent-directive.js
//Purpose: 


var plot_parent_directive = function($scope) {
}

plotModule.directive('plotParent', function() {
    var initObj = {
        restrict: 'A',
        scope: {
            CV: '=initConfig'
        },
        controller: plot_parent_directive
    };
    return initObj;
});

