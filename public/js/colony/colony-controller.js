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
    
    // Assign values to the scope.CV.fit_scale function and scope.CV.genFoci positions
    function set_scale_foci( nodeLayouts) {
        // Determine the horizontal spacing for each generation based on root node radius.
        for (var i=0; i < nodeLayouts.length; i++) {
            var currGen = nodeLayouts[i];
            for (var j=0; j < currGen.length; j++) {
                if (currGen[j].depth == 0) {
                    scope.CV.genFoci[i] = {'radius': currGen[j].r,
                        'x': currGen[j].x,
                        'y': currGen[j].y};
                    break;
                }
            }
        }
    
        var genPadding = 25;
        // Add diameter of each generation to scale width.
        var totSpan = scope.CV.genFoci.reduce( function( prev, curr, i, array) {
            return prev + curr.radius * 2;
        }, 0)
        totSpan = totSpan + (genPadding * (nodeLayouts.length - 1));
        // Get max radius to scale the height.
        var maxRadius = scope.CV.genFoci.reduce( function( prev, curr, i, array) {
            return (prev < curr.radius) ? curr.radius : prev;
        }, 0)
    
        // Create scale function
        var x_scale = d3.scale.linear().domain([0, totSpan]).range([0, scope.CV.width]);
        var y_scale = d3.scale.linear().domain([0, maxRadius*2]).range([0, scope.CV.height]);
        scope.CV.fit_scale = (x_scale(maxRadius) < y_scale(maxRadius)) ? x_scale : y_scale;
    
        // Assign foci values
        var runningSum = 0; // Keep track of offset from left of graph
        for (var i=0; i < scope.CV.genFoci.length; i++) {
            var scaledRadius = scope.CV.fit_scale(scope.CV.genFoci[i].radius);
            scope.CV.genFoci[i].radius = scaledRadius;
            scope.CV.genFoci[i]['dx'] = runningSum + scaledRadius - scope.CV.genFoci[i].x;
            scope.CV.genFoci[i]['dy'] = 0;
            runningSum = runningSum + genPadding + (scaledRadius * 2);
        }
    
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
    
                    // Recursively apply format
                    return applyFormat( '',this.filteredHierarchy, 0);
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
        scope.CV.size_by = function() { return 1;}
    
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
    
        scope.CV.genFoci = [];
        // Estimate boundary circle of each generation to assign layout size
        for (var i=0; i < scope.CV.allMice.length; i++) {
            // Calculate circle size based on number of nodes
            var totalArea = 64* scope.CV.allMice[i].length;
            scope.CV.genFoci[i] = {"estimate": Math.sqrt(totalArea) };
        }
    
        // Use the circle packing layout to calculate node positions for each generation.
        var nodeLayouts = [];
        for (var i=0; i < scope.CV.miceGenData.length; i++) {
            nodeLayouts.push( d3.layout.pack().size([scope.CV.genFoci[i].estimate * 2, scope.CV.height]).padding(10)
                    .value( scope.CV.size_by)
                    .nodes( scope.CV.miceGenData[i]));
        }
    
        set_scale_foci( nodeLayouts);
    
        return nodeLayouts;
    }

    //-- Run initialization
    // initialLayout is a promise obj
    scope.initialLayout = initData.then( 
        function(result) {
            return initialize( result.data);
        },
        function( error) {
            console.error( error);
        });

}]);


