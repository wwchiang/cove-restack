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
    
    
    // Function to create the minimal object structure needed for circle packing
    function mice_data_format( data) {
        var dataFormatted = [];
        for (var i=0; i < data.length; i++) {
            dataFormatted.push( {'name': 'Gen' + i, 'children': data[i]});
        }
        return dataFormatted;
    }

    // Function to declare initial values for dimensions and also some
    // data structures for use by the colony plot.
    var initialize = function ( miceData) {

        //scope.CV.allMice = JSON.parse( miceData.trim() );
        scope.CV.allMice = miceData;
        //The allMice object is an array of arrays for generation data, and element a json object.
        //Convert to format for hierarchical packing (1 level for all objects of a generation).
        //Use separate layout for each generation.
        scope.CV.miceGenData = mice_data_format( scope.CV.allMice);
    
        // Mice data format needs to support additional hierarchy such as by gender and litter.
        // Create an object that stores fxns that need to be applied to the original raw data
        // to achieve the filtering and grouping specified by user.
        scope.CV.formattedData = 
            { // format_fxns are functions that take one parameter - array of raw data objects
                'filteredHierarchy': mice_data_format( scope.CV.allMice),
                // format fxns add an additional level of grouping to leaf nodes
                'format_fxns': [],
                // filter functions take one parameter - a node to test
                'filter_fxns': [],
                // perform the grouping functions and return data in format for circle packing
                'get_hierarchy': function() {
                    // Recursive helper fxn
                    var that = this;
                    var applyFormat = function( parentName, currLevel, format_index) {
                        var innerHierarchy = [];
                        for (var ci=0; ci < currLevel.length; ci++) {
                            var formattedGroup =
                                // Ensure the group name is unique for the circles denoting a group, and not
                                // a node, ie. a female and male group will both have a group representing litter 1
                                {'name': parentName + currLevel[ci].name,
                                 'colorGroup': typeof currLevel[ci].colorGroup !== 'undefined' ?
                                    currLevel[ci].colorGroup : 'rgba(150,150,150,.9)',
                                 'children': that.format_fxns[format_index]( currLevel[ci].children) };
                            // A depth first approach in recursion, in which the format_index
                            // corresponds to depth
                            if ( (format_index + 1) < that.format_fxns.length) {
                                // Overwrite children array with additional hierarchy
                                formattedGroup.children = applyFormat( formattedGroup.name, formattedGroup.children, format_index + 1);
                            }
                            else {
                                // Modify the leaf 'name' with a parent prefix
                                for( var i=0; i < formattedGroup.children.length; i++) {
                                    formattedGroup.children[i].name = currLevel[ci].name + formattedGroup.children[i].name;
                                }
                            }
                            innerHierarchy.push( formattedGroup);
                        }
                        return innerHierarchy;
                    };
    
                    if( this.format_fxns.length > 0) {
                        // Recursively apply format
                        return applyFormat( '',this.filteredHierarchy, 0);
                    }
                    else {
                        return this.filteredHierarchy;
                    }
                },
                // The id parameter needs to correlate with DOM checkbox that uses the 'fmt' function
                'add_format': function( id, fmt) {
                    // Attach the id as an attribute belonging to the fmt function object
                    fmt.id = id;
                    this.format_fxns.push( fmt);
                },
                'remove_format': function( id) {
                    this.format_fxns = this.format_fxns.filter( function( elem) { return elem.id != id; });
                },
                'add_filter': function( id, filterFxn) {
                    // Attach the id as an attribute belonging to the fmt function object
                    filterFxn.id = id;
                    this.filter_fxns.push( filterFxn);
                    //this.filteredHierarchy = mice_data_format( scope.CV.allMice);
                    // Apply additional filter
                    // Filters designate what *can* be displayed.
                    // Filter members of each generation
                    for (var g=0; g < this.filteredHierarchy.length; g++) {
                        this.filteredHierarchy[g].children = this.filteredHierarchy[g].children.filter( filterFxn); 
                    }
                },
                'remove_filter': function( id) {
                    this.filter_fxns = this.filter_fxns.filter( function( elem) { return elem.id != id; });
                    this.filteredHierarchy = mice_data_format( scope.CV.allMice);
                    // Re-Apply remaining filters
                    for (var fi=0; fi < this.filter_fxns.length; fi++ ) {
                        // Filter members of each generation
                        for (var g=0; g < this.filteredHierarchy.length; g++) {
                            this.filteredHierarchy[g].children = this.filteredHierarchy[g].children.filter(this.filter_fxns[fi]); 
                        }
                    }
                }
            };
    
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
