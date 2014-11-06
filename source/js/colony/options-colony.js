
colonyOptionsModule.directive('colonyoptions', function() {
    return {
        restrict: 'E',
        require: ['^plotParent'],
        scope: {},
        templateUrl: 'colony-options.html',
        link: function(scope, element, attrs) {
            scope.ageFilter = "All";
        },
        replace: true
    };
});

colonyOptionsModule.directive('genderGroup', [function() {
    return {
        restrict: 'A',
        require: ['^plotParent'],
        link: function(scope, element, attrs, ctl) {
            element.bind("click", function() {
                if( element.prop("checked") ) {
                    ctl[0].format_gender( "genderCheck");
                }
                else {
                    ctl[0].remove_format_gender( "genderCheck");
                }
            });
        }
    };
}]);

colonyOptionsModule.directive('searchBtn', [function() {
    return {
        restrict: 'A',
        require: ['^plotParent'],
        link: function(scope, element, attrs, ctl) {
            element.bind("click", function() {
                var success = ctl[0].search_mouse(scope.mouseId);
                if( !success) {
                    scope.searchResponse = "The mouse id " + scope.mouseId + " could not be found.";
                }
                else {
                    scope.searchResponse = "";
                }
            });
        }
    };
}]);

colonyOptionsModule.directive('genderFilter', [function() {
    return {
        restrict: 'A',
        require: ['^plotParent'],
        link: function(scope, element, attrs, ctl) {
            element.bind("click", function() {
                if( attrs["value"] === "All" ) {
                    ctl[0].remove_filter( "filterGender");
                }
                else {
                    ctl[0].filter_value( "filterGender", attrs["name"], attrs["value"]);
                }
            });
        }
    };
}]);
