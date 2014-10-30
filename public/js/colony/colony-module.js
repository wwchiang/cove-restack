//File: colony-module.js
//Purpose: Features for the colony view plot

var plotModule = angular.module('colonyPlot', []);

var node_factory = function() {
    return {};
}

//Factory to provide functions to create d3 circles representing mice.
//plotModule.factory('nodeDrawing', ['$http', function(http) {
plotModule.factory('nodeDrawing', node_factory);


plotModule.directive('child1', function() {
    var initObj = {
        restrict: 'A',
        require: ['^plotParent'],
        scope: {
        },
        link: function( scope, element, attrs, ctl) {
            ctl[0].testFxn = function() {
                element.text("Hola!");
            }
        }
    };
    return initObj;
});

plotModule.directive('searchButton', function() {
    var initObj = {
        restrict: 'A',
        require: ['^plotParent'],
        scope: {
        },
        link: function( scope, element, attrs, ctl) {
            element.on('click', function() {
                ctl[0].testFxn(); 
            });
        }
    };
    return initObj;
});

plotModule.directive('d3details', function() {
    var initObj = {
        restrict: 'A',
        link: function(scope, element, attrs) {
                // Mouse info is left blank until hover event occurs
                d3.select("#mouseInfoDetails")
                    .style("position", "fixed")
                    .style("top", "20px")
                    .style("right", "5px")
                    .append("svg")
                        .attr("id", "mouseDetails")
                        .attr("width", CV.infoWidth)
                        .attr("height", CV.infoHeight);
        }
    };
    return initObj;
});
            
plotModule.directive('d3lineage',  function() {
    var initObj = {
        restrict: 'A',
        link: function(scope, element, attrs) {
                d3.select("#mouseInfoLineage")
                    .style("position", "fixed")
                    .style("top", CV.infoHeight + 20 + "px")
                    .style("right", "5px")
                    .append("svg")
                        .attr("id", "lineageGraph")
                        .attr("width",  IV.width)
                        .attr("height", IV.height + IV.childBlock);
        }
    };
    return initObj;
});

//-- Implementation

//Function to create service for changing the colony view.
var node_drawing_service = function(http) {
    return {
        dummyVal : "Test value"
    };
}
