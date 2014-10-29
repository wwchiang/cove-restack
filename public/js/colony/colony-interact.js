//File: colony-plot-module.js
//Purpose: Features for the colony view plot

var plotModule = angular.module('colonyPlot', []);

plotModule.factory('initData', ['$http', function(http) {
    http.get('/mice.txt').success(function(data, status, headers, config) {
        return data;
    });
}]);

//Initialize the svg area displaying d3 visualizations.
plotModule.controller("colonyPlotController", ['$scope', 'initData', function(scope, initData) {

    //-- Helper functions

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
    scope.initialLayout = initialize( initData);

}]);


//Factory to provide functions to create d3 circles representing mice.
plotModule.factory('nodeDrawing', function() {

    // Format mice data to have hierarchy of generation then gender type
    var create_gender_format = function ( rawNodes) {
        // Create additional grouping by gender
        var genderGroup = [];
        var grouping =  {'name': 'female',
                         'colorGroup': 'rgba(250,0,0,1)',
                         'children': rawNodes.filter( function( elem) { return elem.gender == "F"; })
        };
        if (grouping.children.length > 0) { genderGroup.push( grouping); }
    
        var grouping =  {'name': 'male',
                         'colorGroup': 'rgba(0,0,250,1)',
            'children': rawNodes.filter( function( elem) { return elem.gender == "M"; })
        };
        if (grouping.children.length > 0) { genderGroup.push( grouping); }
    
        var grouping =  {'name': 'unknown',
            'children': rawNodes.filter( function( elem) { return (elem.gender != "M") && (elem.gender != "F"); })
        };
        if (grouping.children.length > 0) { genderGroup.push( grouping); }
    
        return genderGroup;
    }

    // Return an array of an array of objects that have data for position and size.
    var layout_generations = function ( genArray) {
        // Use the circle packing layout to calculate node positions for each generation.
        var nodeLayouts = [];
        for (var i=0; i < genArray.length; i++) {
            // The size for packing is currently based on last boundary circle size
            nodeLayouts.push( d3.layout.pack().size([CV.genFoci[i].radius * 2, CV.height]).padding(10)
                    .value( CV.size_by)
                    .nodes( genArray[i]));
        }
        return nodeLayouts;
    }
    
    // Update position of circles
    var update_view = function ( nodeLayouts) {
        set_scale_foci( nodeLayouts);
        // Update the translation for each generation based on any change in genFoci and radii
        for (var i=0; i < nodeLayouts.length; i++) {
            d3.select("#g" + i).attr("transform","translate(" + CV.genFoci[i].dx + ", " + CV.genFoci[i].dy + ")" );
        }
        // Go through each generation in nodeLayout
        for (var i=0; i < nodeLayouts.length; i++) {
            var genSelect = d3.select("#g" + i).selectAll(".gen" + i)
                .data(nodeLayouts[i], function(d) {
                    return d.mouseId ? d.mouseId : d.name; });
            // when the last gen is being updated, indicate ok to schedule arrow update
            if (i == nodeLayouts.length - 1) {
                CV.arrowReady = true;
            }
            // Add any inner hierarchy circles
            genSelect.enter()
                .insert("circle")
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; })
                .attr("r", function(d) { return CV.fit_scale(d.r); })
                .classed("node", function(d) { return d.mouseId ? true : false; })
                .classed("gen" + i, "true")
                .style("stroke", "rgba(150,150,150,0.1)")
                .style("stroke-width", "1.0px")
                .style("fill", function(d) { return d.mouseId ? CV.color_fxn(d) : "rgba(255,255,255,0)";} );
            // Remove any hierarchy circles not needed
            genSelect.exit()
                .transition().duration(1200).style("stroke", "rgba(150, 150, 150, .2").remove();
            // Update nodes
            genSelect.each( function(nodeData) {
                var thisNode = d3.select(this);
                var thisTran = thisNode.transition()
                    .delay(700 * Math.pow(i, 1.5)).duration(1400 * Math.pow(i, 1.5))
                    .style("stroke", function(d) {
                        return typeof d.colorGroup !== 'undefined' ? d.colorGroup : "rgba(150,150,150,0.9)" })
                    .attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; })
                    .attr("r", function(d) { return CV.fit_scale(d.r); })
                if (CV.arrowReady) {
                    thisTran.transition().call( function() {
                        var lines = find_endpoints( CV.nodeLayout, CV.genFoci);
                        draw_arrows( CV.svg, lines, AR.line_generator);
                    });
                    // Only execute once
                    CV.arrowReady = false;
                }
                var colorOption = d3.select("#selectColorGroup").node();
                var colorBy = colorOption.options[colorOption.selectedIndex].value;
                var pieNode = d3.selectAll(".pie-" + nodeData.mouseId);
                if ( (colorBy == "customGenotype") && !pieNode.empty() ) {
                    pieNode.transition().delay(700 * Math.pow(i, 1.5)).duration(1400 * Math.pow(i, 1.5))
                        .attr("transform", "translate(" + nodeData.x + "," + nodeData.y + ")")
                        .style("opacity","1");
                    // check if the update has caused the size of the node to change
                    if (thisNode.attr("r") != CV.fit_scale(nodeData.r)) {
                        CV.arc.outerRadius( nodeData.r);
                        pieNode.selectAll("path").attr("d", CV.arc);
                    }
                }
            });
        }
        d3.selectAll(".node")
          .on("mouseover", function() {handle_mouseover( d3.select(this)); })
          .on("click", function() { handle_node_click( d3.select(this)); });
    }

});


//Directive for initial plot
plotModule.directive('d3colony', ['nodeDrawing', function(nodeDrawing) {
    var initObj = {
        restrict: 'A',
        link: function(scope, element, attrs) {

            var create_initial_view = function ( initNodes) {
                //var divGraph = d3.select("#graph");
                var divGraph = d3.select(element[0]);
                divGraph.attr("height", CV.height + 100)
                    .attr("width", CV.width + CV.infoWidth + 150);
                CV.svg = divGraph.append("svg")
                        .attr("width", CV.width )
                        .attr("height", CV.height);
            
                // Add event handlers to various view options
                //d3.select("#selectColorGroup").on("change", handle_color);
                //d3.select("#selectSizeBy").on("change", handle_size);
                //d3.select("#genderCheck").on("click", handle_group_gender);
                //d3.select("#litterCheck").on("click", handle_group_litter);
                ////d3.select("#geneCheck").on("click", handle_group_gene);
                //d3.select("#addGenotypeFilter").on("click", handle_add_geno_filter);
                //d3.select("#doneGenotypeFilter").on("click", handle_done_geno_filter);
                //d3.select("#allGeno").on("click", handle_all_geno_filter);
                //d3.selectAll("#geneSelector input").on("click", handle_gene);
                //d3.selectAll("#colorGeneSelector input").on("click", handle_gene_color);
                //d3.selectAll("#genderFilter input").on("click", handle_filter_gender);
                //d3.selectAll("#ageFilter input").on("click", handle_filter_age);
                //d3.select("#ageStart").on("change", handle_filter_age_range);
                //d3.select("#ageEnd").on("change", handle_filter_age_range);
                //d3.select("#addGenotypeColor").on("click", handle_add_geno_color);
                //d3.select("#doneGenotypeColor").on("click", handle_done_geno_color);
                //d3.select("#submitSearch").on("click", handle_search);
            
                // Use default color selection indicated by DOM dropdown element
                //var colorOption = d3.select("#selectColorGroup").node();
                //var colorBy = colorOption.options[colorOption.selectedIndex].value;
                //if (colorBy == "gender") { CV.color_fxn = assign_gender_color; }
                //else if (colorBy == "genotype") { CV.color_fxn = assign_genotype_color;}
                //else { CV.color_fxn = assign_gender_color; }
            
                for (var i=0; i < initNodes.length; i++) {
                    var genGrp = CV.svg.append("g").datum(i)
                            .attr("id","g" + i)
                            .attr("transform", "translate(" + CV.genFoci[i].dx + ", " + CV.genFoci[i].dy + ")" );
                    genGrp.selectAll(".gen" + i).data(initNodes[i])
                            .enter()
                            .append("circle")
                            .attr("cx", function(d) { return d.x; })
                            .attr("cy", function(d) { return d.y; })
                            .attr("r", function(d) { return CV.fit_scale(d.r); })
                            .classed("node", function(d) { return d.mouseId ? true : false; })
                            .classed("gen" + i, "true")
                            .style("stroke", "rgb(150,150,150)")
                            .style("stroke-width", "1.0px")
                            .style("fill", "grey");
                            //.style("fill", function(d, i) {
                            //    if (d.depth == 0) { return "rgba(255,255,255,0)"; }
                            //    else {
                            //        return CV.color_fxn(d);
                            //    }
                            //});
                    //genGrp.selectAll(".node")
                    //        .on("mouseover", function() {
                    //            var thisNode = d3.select(this);
                    //            handle_mouseover( thisNode);
                    //        })
                    //        .on("click", function() {
                    //            var thisNode = d3.select(this);
                    //            if (thisNode.datum().mouseId) { //ignore hierarchy circles
                    //                handle_node_click( thisNode);
                    //            }
                    //        })
                    //        .on("dblclick", function() {
                    //            var thisNode = d3.select(this);
                    //            if (thisNode.datum().mouseId) { //ignore hierarchy circles
                    //                window.location.href = CV.href_individual( thisNode.datum().mouseId);
                    //            }
                    //        });
                }
                CV.svg.selectAll("g")
                        .append("text")
                        .attr("text-anchor", "middle")
                        .text( function(d) { return "Gen" + d;})
                        .attr("x", function(d) { return CV.genFoci[d].x; })
                        .attr("y", CV.height - 25);
            
            }

            //scope.CV.formattedData.add_format( "genderCheck", nodeDrawing.create_gender_format);
            //scope.CV.nodeLayout = nodeDrawing.layout_generations( scope.CV.formattedData.get_hierarchy() );
            //nodeDrawing.update_view( scope.CV.nodeLayout);
            //var lines = find_endpoints( scope.CV.nodeLayout, scope.CV.genFoci);
            //setTimeout( function() { draw_arrows( scope.CV.svg, lines, AR.line_generator);}, 5000);
        }
    };

    return initObj;
}]);
            
plotModule.directive('d3details', ['nodeDrawing', function(nodeDrawing) {
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
}]);
            
plotModule.directive('d3lineage', ['nodeDrawing', function(nodeDrawing) {
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
}]);
