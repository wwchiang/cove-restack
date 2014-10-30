//File: child-plot-directive.js
//Purpose:

var child_plot_link = function(scope, element, attrs, ctl) {

    // Holder for the values that affect plot features for color, grouping,...
    var plotConfig = {};

    //The coordinates of the center of each circle that represents a generation group.
    plotConfig.genFoci = [];

    //-- Helper functions

    // The layout of packed circles was based on an arbitrary size for the smallest circle.
    // Everything then needs to be scaled to match the dimensions of the plot.
    // Assign values to the fit_scale function and genFoci positions.
    function set_scale_foci( nodeLayouts) {

        // Determine the horizontal spacing for each generation based on root node radius.
        for (var i=0; i < nodeLayouts.length; i++) {
            var currGen = nodeLayouts[i];
            for (var j=0; j < currGen.length; j++) {
                if (currGen[j].depth == 0) {
                    plotConfig.genFoci[i] = {'radius': currGen[j].r,
                        'x': currGen[j].x,
                        'y': currGen[j].y};
                    break;
                }
            }
        }
    
        var genPadding = 25;
        // Add diameter of each generation to scale width.
        var totSpan = plotConfig.genFoci.reduce( function( prev, curr, i, array) {
            return prev + curr.radius * 2;
        }, 0)
        totSpan = totSpan + (genPadding * (nodeLayouts.length - 1));
        // Get max radius to scale the height.
        var maxRadius = plotConfig.genFoci.reduce( function( prev, curr, i, array) {
            return (prev < curr.radius) ? curr.radius : prev;
        }, 0)
    
        // Create scale function
        var x_scale = d3.scale.linear().domain([0, totSpan]).range([0, scope.CV.width]);
        var y_scale = d3.scale.linear().domain([0, maxRadius*2]).range([0, scope.CV.height]);
        plotConfig.fit_scale = (x_scale(maxRadius) < y_scale(maxRadius)) ? x_scale : y_scale;
    
        // Assign foci values
        var runningSum = 0; // Keep track of offset from left of graph
        for (var i=0; i < plotConfig.genFoci.length; i++) {
            var scaledRadius = plotConfig.fit_scale(plotConfig.genFoci[i].radius);
            plotConfig.genFoci[i].radius = scaledRadius;
            plotConfig.genFoci[i]['dx'] = runningSum + scaledRadius - plotConfig.genFoci[i].x;
            plotConfig.genFoci[i]['dy'] = 0;
            runningSum = runningSum + genPadding + (scaledRadius * 2);
        }
    }
    

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
            nodeLayouts.push( d3.layout.pack().size([plotConfig.genFoci[i].radius * 2, scope.CV.height]).padding(10)
                    .value( function() { return 1;})
                    .nodes( genArray[i]));
        }
        return nodeLayouts;
    }


    //Function to create elements for the plot.
    var create_initial_view = function ( initNodes) {

        //var divGraph = d3.select("#graph");
        var divGraph = d3.select(element[0]);
        divGraph.attr("height", scope.CV.height + 100)
            .attr("width", scope.CV.width + scope.CV.infoWidth + 150);
        scope.CV.svg = divGraph.append("svg")
                .attr("width", scope.CV.width )
                .attr("height", scope.CV.height);
    
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
        //if (colorBy == "gender") { scope.CV.color_fxn = assign_gender_color; }
        //else if (colorBy == "genotype") { scope.CV.color_fxn = assign_genotype_color;}
        //else { scope.CV.color_fxn = assign_gender_color; }

        set_scale_foci( initNodes);
    
        for (var i=0; i < initNodes.length; i++) {
            var genGrp = scope.CV.svg.append("g").datum(i)
                    .attr("id","g" + i)
                    .attr("transform", "translate(" + plotConfig.genFoci[i].dx + ", " + plotConfig.genFoci[i].dy + ")" );
            genGrp.selectAll(".gen" + i).data(initNodes[i])
                    .enter()
                    .append("circle")
                    .attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; })
                    .attr("r", function(d) { return plotConfig.fit_scale(d.r); })
                    .classed("node", function(d) { return d.mouseId ? true : false; })
                    .classed("gen" + i, "true")
                    .style("stroke", "rgb(150,150,150)")
                    .style("stroke-width", "1.0px")
                    .style("fill", "grey");
                    //.style("fill", function(d, i) {
                    //    if (d.depth == 0) { return "rgba(255,255,255,0)"; }
                    //    else {
                    //        return scope.CV.color_fxn(d);
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
            //                window.location.href = scope.CV.href_individual( thisNode.datum().mouseId);
            //            }
            //        });
        }
        scope.CV.svg.selectAll("g")
                .append("text")
                .attr("text-anchor", "middle")
                .text( function(d) { return "Gen" + d;})
                .attr("x", function(d) { return plotConfig.genFoci[d].x; })
                .attr("y", scope.CV.height - 25);
    
    }


    //Function to re-draw the plot based on changes to existing nodes
    //or adding nodes or grouping structure.
    var update_view = function ( nodeHierarchy) {

        var nodeLayouts = layout_generations( nodeHierarchy);

        set_scale_foci( nodeLayouts);
        // Update the translation for each generation based on any change in genFoci and radii
        for (var i=0; i < nodeLayouts.length; i++) {
            d3.select("#g" + i).attr("transform","translate(" + plotConfig.genFoci[i].dx + ", " + plotConfig.genFoci[i].dy + ")" );
        }
        // Go through each generation in nodeLayout
        for (var i=0; i < nodeLayouts.length; i++) {
            var genSelect = d3.select("#g" + i).selectAll(".gen" + i)
                .data(nodeLayouts[i], function(d) {
                    return d.mouseId ? d.mouseId : d.name; });
            // when the last gen is being updated, indicate ok to schedule arrow update
            if (i == nodeLayouts.length - 1) {
                scope.CV.arrowReady = true;
            }
            // Add any inner hierarchy circles
            genSelect.enter()
                .insert("circle")
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; })
                .attr("r", function(d) { return plotConfig.fit_scale(d.r); })
                .classed("node", function(d) { return d.mouseId ? true : false; })
                .classed("gen" + i, "true")
                .style("stroke", "rgba(150,150,150,0.1)")
                .style("stroke-width", "1.0px")
                .style("fill", function(d) { return d.mouseId ? scope.CV.color_fxn(d) : "rgba(255,255,255,0)";} );
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
                    .attr("r", function(d) { return plotConfig.fit_scale(d.r); })
                if (scope.CV.arrowReady) {
                    thisTran.transition().call( function() {
                        //var lines = find_endpoints( scope.CV.nodeLayout, scope.CV.genFoci);
                        //draw_arrows( scope.CV.svg, lines, AR.line_generator);
                    });
                    // Only execute once
                    scope.CV.arrowReady = false;
                }
                var colorOption = d3.select("#selectColorGroup").node();
                var colorBy = colorOption.options[colorOption.selectedIndex].value;
                var pieNode = d3.selectAll(".pie-" + nodeData.mouseId);
                if ( (colorBy == "customGenotype") && !pieNode.empty() ) {
                    pieNode.transition().delay(700 * Math.pow(i, 1.5)).duration(1400 * Math.pow(i, 1.5))
                        .attr("transform", "translate(" + nodeData.x + "," + nodeData.y + ")")
                        .style("opacity","1");
                    // check if the update has caused the size of the node to change
                    if (thisNode.attr("r") != plotConfig.fit_scale(nodeData.r)) {
                        scope.CV.arc.outerRadius( nodeData.r);
                        pieNode.selectAll("path").attr("d", scope.CV.arc);
                    }
                }
            });
        }
        d3.selectAll(".node")
          .on("mouseover", function() {handle_mouseover( d3.select(this)); })
          .on("click", function() { handle_node_click( d3.select(this)); });
    }


    //-- Run creation of plot

    scope.initialConfig.then( 
        // Draw nodes for each generation of mice.
        function() {
            // Estimate boundary circle of each generation to assign layout size.
            // This is necessary because the d3 circle packing function needs an overall size.
            // The x and y coordinates will be filled in after the circle packing is run.
            // This info is saved so that when user selects actions such as filtering,
            // then the circles representing a generation will remain in the same place.
            for (var i=0; i < scope.CV.allMice.length; i++) {
                // Calculate circle size based on number of nodes
                var totalArea = 64* scope.CV.allMice[i].length;
                plotConfig.genFoci[i] = {
                    "radius": Math.sqrt(totalArea),
                    "x": 0,
                    "y": 0 
                };
            }
    
            //var layout = layout_generations( scope.CV.formattedData.get_hierarchy());
            var layout = layout_generations( scope.CV.miceGenData);
            create_initial_view( layout); 
        }
    ).then(
        // Give the plot an initial grouping by gender.
        function() {
            scope.CV.formattedData.add_format( "genderCheck", create_gender_format);
            update_view( scope.CV.formattedData.get_hierarchy());
        }
    );

    //scope.CV.formattedData.add_format( "genderCheck", create_gender_format);
    //scope.scope.CV.nodeLayout = nodeDrawing.layout_generations( scope.scope.CV.formattedData.get_hierarchy() );
    //nodeDrawing.update_view( scope.scope.CV.nodeLayout);
    //var lines = find_endpoints( scope.scope.CV.nodeLayout, scope.scope.CV.genFoci);
    //setTimeout( function() { draw_arrows( scope.scope.CV.svg, lines, AR.line_generator);}, 5000);

}

//Directive for initial plot
plotModule.directive('d3colony', function() {
    var initObj = {
        restrict: 'A',
        require: ['^plotParent'],
        link: child_plot_link
    };
    return initObj;
});
