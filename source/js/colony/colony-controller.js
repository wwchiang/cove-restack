//File: colony-controller.js
//Purpose: 


plotModule.factory('initData', ['$http', function(http) {
    //Return a promise for the data.
    return http.get('/mice.txt');
}]);

//Initialize the svg area displaying d3 visualizations.
plotModule.controller("colonyPlotController", ['$scope', 'initData', function(scope, initData) {

    //-- Helper functions and initial values to configure the plot such as dimensions and utilities.

    // Containers for global data to be referenced explicitly.
    scope.CV = {}; //data for general colony view
    scope.IV = {}; //data related to lineage tree

    // Allow function currying - copied from "Javascript: The Good Parts" by Crockford
    Function.prototype.curry = function() {
        var slice = Array.prototype.slice,
                args = slice.apply(arguments),
                that = this;
        return function() {
            return that.apply(null, args.concat(slice.apply(arguments)));
        };
    };
    
    // General function to determine if an object is empty
    function is_empty( obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop) ) {
                return false;
            }
        }
        return true;
    }
    
    
    // Function to declare initial values for dimensions and also some
    // data structures for use by the colony plot.
    var initialize = function ( miceData) {

        //The allMice object is an array of arrays for generation data, and element a json object.
        //scope.CV.allMice = JSON.parse( miceData.trim() );
        scope.CV.allMice = miceData;
    
        scope.CV.active_genotype_filters = [];
        scope.CV.disabled_genotype_filters = [];
    
        scope.CV.width = 950,
        scope.CV.height = 560;
        scope.CV.infoHeight = 150;
        scope.CV.infoWidth = 350;
        scope.CV.infoXpos = 0;
        scope.CV.infoYpos = 30;
    
        scope.CV.href_individual = function(val) {
            return "http://" + currDomain + "/viz/lineage_view/?mouseId=" + val;
        };
    
        // Initialization for lineage tree
        scope.IV.width = scope.CV.infoWidth;
        scope.IV.height = scope.CV.height - scope.CV.infoHeight - scope.CV.infoYpos - 20;
        scope.IV.childBlock = scope.IV.height / 4;
        scope.IV.tree = d3.layout.tree()
            .size([scope.IV.width - 20, scope.IV.height - scope.IV.childBlock - 70]);
        
        scope.IV.diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });
    
        //scope.CV.genFoci = [];
        var estimateFoci = [];
        // Estimate boundary circle of each generation to assign layout size
    }

    //-- Run initialization
    // initialLayout is a promise obj
    scope.initialConfig = initData.then( 
        function(result) {
            initialize( result.data);
        },
        function( error) {
            console.error( error);
        });

}]);
