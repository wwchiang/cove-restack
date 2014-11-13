
colonyOptionsModule.controller('dateController', ['$scope', function(scope) {
    scope.dobStart = "";
    scope.dobEnd = "";
}]);

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

colonyOptionsModule.directive('datePicker', function() {
    return {
      // Enforce the angularJS default of restricting the directive to
      // attributes only
      restrict: 'A',
      // Always use along with an ng-model
      require: '?ngModel',
      scope: {
        // This method needs to be defined and
        // passed in to the directive from the view controller
        //select: '&'        // Bind the select function we refer to the
                           // right scope
      },
      link: function(scope, element, attrs, ngModel) {
        if (!ngModel) return;

        var optionsObj = {};

        optionsObj.dateFormat = 'mm/dd/yy';
        var updateModel = function(dateTxt) {
          scope.$apply(function () {
            // Call the internal AngularJS helper to
            // update the two-way binding
            ngModel.$setViewValue(dateTxt);
          });
        };

        optionsObj.onSelect = function(dateTxt, picker) {
          updateModel(dateTxt);
        };

        ngModel.$render = function() {
          // Use the AngularJS internal 'binding-specific' variable
          element.datepicker('setDate', ngModel.$viewValue || '');
        };
      }
    };
  });
