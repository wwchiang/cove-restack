//File: child-plot-directive.js
//Purpose:


//The link function for the directive "d3colony". 
var child_plot_link = function(scope, element, attrs, ctl) {

    // Holder for the values that affect plot features for color, grouping,...
    var plotConfig = {};

    //The coordinates of the center of each circle that represents a generation group.
    plotConfig.genFoci = [];


    //-- Helper functions


    // Function to create the minimal object structure needed for circle packing.
    //Convert to format for hierarchical packing (1 level per generation).
    function mice_data_format( data) {
        var dataFormatted = [];
        for (var i=0; i < data.length; i++) {
            dataFormatted.push( {'name': 'Gen' + i, 'children': data[i]});
        }
        return dataFormatted;
    }


    var assign_default_color = function() { return "grey";};

    var assign_gender_color = function( d) {
        if(d.gender == "F") {
            return "#FF7575";
        }
        else if (d.gender == "M") {
            return "#3366FF";
        }
        else return "#C0C0C0";
    }

    
    //The function that will be used to determine color of nodes.
    //Default is grey.
    plotConfig.color_fxn = assign_default_color;

    // The layout of packed circles was based on an arbitrary size for the smallest circle.
    // Everything then needs to be scaled to match the dimensions of the plot.
    // Assign values to the fit_scale function and genFoci positions.
    var set_scale_foci = function( nodeLayouts) {

        // Determine the horizontal spacing for each generation based on root node radius.
        for (var i=0; i < nodeLayouts.length; i++) {
            var currGen = nodeLayouts[i];
            for (var j=0; j < currGen.length; j++) {
                if (currGen[j].depth === 0) {
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
            plotConfig.genFoci[i].dx = runningSum + scaledRadius - plotConfig.genFoci[i].x;
            plotConfig.genFoci[i].dy = 0;
            runningSum = runningSum + genPadding + (scaledRadius * 2);
        }
    };
    

    // Format mice data to have hierarchy of generation then gender type
    var format_gender = function( id) {
        plotConfig.formattedData.add_format( id, function ( rawNodes) {
            // Create additional grouping by gender
            var genderGroup = [];
            var femaleGrouping =  {'name': 'female',
                             'colorGroup': 'rgba(250,0,0,1)',
                             'children': rawNodes.filter( function( elem) { return elem.gender == "F"; })
            };
            if (femaleGrouping.children.length > 0) { genderGroup.push( femaleGrouping); }
    
            var maleGrouping =  {'name': 'male',
                             'colorGroup': 'rgba(0,0,250,1)',
                'children': rawNodes.filter( function( elem) { return elem.gender == "M"; })
            };
            if (maleGrouping.children.length > 0) { genderGroup.push( maleGrouping); }
    
            var unkGrouping =  {'name': 'unknown',
                             'colorGroup': 'rgba(150,150,150,0.9)',
                'children': rawNodes.filter( function( elem) { return (elem.gender != "M") && (elem.gender != "F"); })
            };
            if (unkGrouping.children.length > 0) { genderGroup.push( unkGrouping); }
    
            return genderGroup;
        });
        update_view();
    };


    var remove_format_gender = function( id) {
        plotConfig.formattedData.remove_format( id);
        update_view();
    };

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
    };


    //-- Event Callbacks


    // Callback when user hovers over a circle representing a mouse.
    function handle_mouseout( thisNode) {
        thisNode
           //.classed("hovered", false)
           .style("stroke", "rgb(150, 150, 150)")
           .style("stroke-width", "1.0px");
        if (scope.CV.pathsDisplayed) {
            scope.CV.pathsDisplayed
                .classed("pathHovered", false)
                .style("stroke", "rgba(255,255,255,0)");
        }
    }

    // Callback when user hovers over a circle representing a mouse.
    function handle_mouseover( thisNode) {
        if (thisNode.datum().mouseId) { //only highlight nodes, not hierarchy circles
            thisNode
                //.classed("hovered", true)
                .style( "stroke", "rgb(250,250,0)")
                .style("stroke-width", "3px");
            //var endpoints = [];
            //CV.pathsDisplayed = CV.svg.selectAll("path.arrow").filter( function(d) {
            //    if (d[0].id == thisNode.datum().mouseId) { 
            //        // save ids that are at other end of arrows
            //        endpoints.push(d[2].id);
            //        return true;
            //    }
            //    else if (d[2].id == thisNode.datum().mouseId)  {
            //        endpoints.push(d[0].id);
            //        return true;
            //    }
            //    else return false;
            //});
            //CV.pathsDisplayed
            //        .classed("pathHovered", true)
            //        .style("stroke", "rgba(130,230,190,0.5)");
            //// Highlight the endpoints of arrows
            //var endpointNodes = d3.selectAll("#graph .node").filter( function(d) { 
            //    return endpoints.indexOf(d.mouseId) >= 0; } );
            //endpointNodes
            //    .classed("hovered", true)
            //    .style( "stroke", "rgb(250,250,0)")
            //    .style("stroke-width", "3px");
    
            ////show info on selected node
            //handle_hover_info( thisNode, "genHover");
        }
    }


    // Callback when user clicks on a circle that represents a mouse.
    //function handle_node_click( thisNode) {
    //    var nodes = IV.tree.nodes(thisNode.datum().lineage);
    //    var links = IV.tree.links(nodes);
    //    var graph = d3.select("#lineageGraph");
    //    // cleanup previous drawing
    //    IV.svg.selectAll(".lineageNode").remove();
    //    IV.svg.selectAll(".link").remove();
    //    d3.selectAll(".lineageTooltip").remove();
    //
    //    // Update heading above lineage tree
    //    IV.infoText.text("Lineage tree for mouse " + thisNode.datum().mouseId);
    //    IV.infoText.style("font-style", "normal");
    //
    //    // Create lineage tree
    //    var link = IV.svg.selectAll(".link")
    //        .data(links)
    //      .enter()
    //    	.append("path")
    //        .attr("class", "link")
    //        .style("fill", "none")
    //        .style("stroke", "#cccccc")
    //        .style("stroke-width", "1.5px")
    //        .attr("d", IV.diagonal);
    //    
    //    var nodeElements = IV.svg.selectAll(".lineageNode")
    //        .data(nodes)
    //      .enter().append("g")
    //        .attr("class", "lineageNode")
    //        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
    //        // Make absolute position info easier to access for child elements that maintain relative position.
    //        .attr("x", function( d) { return d.x;})
    //        .attr("y", function( d) { return d.y;});
    //    
    //    var matchMouse;
    //    nodeElements.append("circle")
    //        .attr("r", 4.5)
    //        .style("fill", function(d) {
    //            if(d.gender == "F") {
    //                return "#FF7575";
    //            }
    //            else if (d.gender == "M") {
    //                return "#3366FF";
    //            }
    //            else return "#C0C0C0";
    //        })
    //        .on("mouseover", function() {
    //            //undo any previous selection
    //            d3.select(".lineageHovered")
    //                    .classed("lineageHovered", false)
    //                    .style("stroke", "rgb(150, 150, 150)")
    //                    .style("stroke-width", "1.0px");
    //            var hoverNode = d3.select(this);
    //            hoverNode.classed("lineageHovered", true)
    //                .style( "stroke", "rgb(250,250,0)")
    //                .style("stroke-width", "3px");
    //            // removes all tooltips
    //            d3.selectAll(".lineageTooltip").remove();
    //            add_tooltip( hoverNode, "lineageTooltip"); 
    //            d3.selectAll(".lineageTooltip")
    //               .attr("transform", "translate(20,0) rotate(90)");
    //            //trigger highlight in main gen view
    //            matchMouse = d3.selectAll("#graph .node").filter( function(d) { 
    //                return d.mouseId == hoverNode.datum().mouseId; } );
    //            handle_mouseover( matchMouse);
    //            })
    //        .on("click", function() {
    //            var thisNode = d3.select(this);
    //            handle_node_click( matchMouse);
    //        })
    //    // Update info header for number of children the selected mouse has
    //    IV.childInfoText.text("Children: " + thisNode.datum().numOffspring);
    //    // Find data belonging to children inside existing nodes in main graph
    //    var treeChildren = [];
    //    d3.selectAll("#graph .node").each( function(d) { 
    //        if (thisNode.datum().childIds.indexOf(d.mouseId) >= 0) {
    //            treeChildren.push(d);
    //        }
    //    } );
    //    // Draw children
    //    var ypos = CV.infoYpos + IV.height - IV.childBlock + 30;
    //    var drawnLineage = IV.svgChildNodes.selectAll(".lineageNode")
    //        //.data( thisNode.datum().childIds)
    //        .data( treeChildren, function (d) {
    //            return d.mouseId ? d.mouseId : d.name; });
    //    var childRadius = 4.5;
    //    var nodesPerLine = Math.floor( (IV.width - (childRadius*6))/(childRadius*4) );
    //    var matchMouse2;
    //    drawnLineage.enter().append("circle")
    //        .attr("r", childRadius)
    //        .attr("cx", function(d,i) { 
    //            return 10 + (i % nodesPerLine) * childRadius*4;
    //        })
    //        .attr("cy", function(d,i) {
    //            return ypos + Math.floor(i/nodesPerLine) * 25;
    //        })
    //        .classed("lineageNode", true)
    //        .style("stroke", "rgb(150,150,150)")
    //        .style("stroke-width", "1.0px")
    //        .style("fill", function(d) {
    //            if(d.gender == "F") {
    //                return "#FF7575";
    //            }
    //            else if (d.gender == "M") {
    //                return "#3366FF";
    //            }
    //            else return "#C0C0C0";
    //        })
    //        .on("mouseover", function() {
    //            //undo any previous selection
    //            d3.select(".lineageHovered")
    //                    .classed("lineageHovered", false)
    //                    .style("stroke", "rgb(150, 150, 150)")
    //                    .style("stroke-width", "1.0px");
    //            var hoverNode = d3.select(this);
    //            hoverNode.classed("lineageHovered", true)
    //                .style( "stroke", "rgb(250,250,0)")
    //                .style("stroke-width", "3px");
    //            // removes all tooltips
    //            d3.selectAll(".lineageTooltip").remove();
    //            add_tooltip( hoverNode, "lineageTooltip"); 
    //            //trigger highlight in main gen view
    //            matchMouse2 = d3.selectAll("#graph .node").filter( function(d) { 
    //                return d.mouseId == hoverNode.datum().mouseId; } );
    //            handle_mouseover( matchMouse2);
    //            })
    //        .on("click", function() {
    //            var thisNode = d3.select(this);
    //            handle_node_click( matchMouse2);
    //        })
    //    drawnLineage.exit().remove();
    //}

    //Function to create elements for the plot.
    var create_initial_view = function ( ) {

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

        var nodeHierarchy = plotConfig.formattedData.get_hierarchy();
        var nodeLayouts = layout_generations( nodeHierarchy);
        set_scale_foci( nodeLayouts);
    
        for (var i=0; i < nodeLayouts.length; i++) {
            var genGrp = scope.CV.svg.append("g").datum(i)
                    .attr("id","g" + i)
                    .attr("transform", "translate(" + plotConfig.genFoci[i].dx + ", " + plotConfig.genFoci[i].dy + ")" );
            genGrp.selectAll(".gen" + i).data(nodeLayouts[i])
                    .enter()
                    .append("circle")
                    .attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; })
                    .attr("r", function(d) { return plotConfig.fit_scale(d.r); })
                    .classed("node", function(d) { return d.mouseId ? true : false; })
                    .classed("gen" + i, "true")
                    .style("stroke", "rgb(150,150,150)")
                    .style("stroke-width", "1.0px")
                    .style("fill", function(d, i) {
                        if (d.depth == 0) { return "rgba(255,255,255,0)"; }
                        else {
                            return plotConfig.color_fxn(d);
                        }
                    });
            genGrp.selectAll(".node")
                    .on("mouseover", function() {
                        var thisNode = d3.select(this);
                        handle_mouseover( thisNode);
                    })
                    .on("mouseout", function() {
                        var thisNode = d3.select(this);
                        handle_mouseout( thisNode);
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
                    });
        }
        scope.CV.svg.selectAll("g")
                .append("text")
                .attr("text-anchor", "middle")
                .text( function(d) { return "Gen" + d;})
                .attr("x", function(d) { return plotConfig.genFoci[d].x; })
                .attr("y", scope.CV.height - 25);
    
    };


    //Function to re-draw the plot based on changes to existing nodes
    //or adding nodes or grouping structure.
    var update_view = function () {
        
        var nodeHierarchy = plotConfig.formattedData.get_hierarchy();

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
                .style("fill", function(d) { return d.mouseId ? plotConfig.color_fxn(d) : "rgba(255,255,255,0)";} );
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
                    .attr("r", function(d) { return plotConfig.fit_scale(d.r); });
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
          .on("mouseout", function() {handle_mouseout( d3.select(this)); });
          //.on("click", function() { handle_node_click( d3.select(this)); });
    };


    //Search for a given mouse, and highlight
    var search_mouse = function( searchId) {

        var foundMouse = d3.selectAll(".node").filter( function(d) {
            return d.mouseId == searchId; } );
        if (!foundMouse.empty()) {
            handle_mouseover( foundMouse);
            foundMouse.transition().delay(300).style("stroke","rgba(255,255,255,0)")
                .transition().duration(1000).style("stroke","rgba(250,200,0,1)")
                .style("stroke-width","14px")
                .transition().delay(1300).style("stroke","rgba(255,255,255,0)")
                .transition().delay(1600).duration(1000).style("stroke","rgba(250,200,0,0.7)")
                .style("stroke-width","3px");
            return true;
        }
        else {
            return false;
        }
    };


    //Filter the data by checking for a single value in the given object attribute name.
    var filter_value = function( id, attrName, attrVal) {
        //Clear any previous filter for the same id.
        plotConfig.formattedData.remove_filter( id);
        plotConfig.formattedData.add_filter( id,  function(item) {
            return item[attrName] == attrVal;
        });
        update_view();
    };


    var age_to_date = function( age) {
        // Convert age to a date
        var msDay = 24 * 60 * 60 * 1000;
        // Cannot be greater than tgtDate to meet min age
        var tgtDate = new Date( Date.now() - (age * msDay));
        var tgtYear = "" + tgtDate.getFullYear();
        var tgtMonth = tgtDate.getMonth() + 1;
        tgtMonth = tgtMonth > 9 ? "" + tgtMonth : "0" + tgtMonth;
        var tgtDay = tgtDate.getDate();
        tgtDay = tgtDay > 9 ? "" + tgtDay : "0" + tgtDay;
        return parseInt(tgtYear + tgtMonth + tgtDay);
    };


    //Filter the mice data.
    var filter_int_val = function( cmp_fxn, id, attrName, tgtVal ) {

        //Clear any previous filter for the same id.
        plotConfig.formattedData.remove_filter( id);
        plotConfig.formattedData.add_filter( id,  function(item) {
            var res = false;
            var itemVal = parseInt(item[attrName]);
            itemVal = isNaN( itemVal) ? 0 : itemVal;
            // In case a low or hi limit value is not provided, default to true
            if (!tgtVal) {
               res = true;
            }
            else {
               res = cmp_fxn( itemVal, tgtVal);
            }
            return res;
        });
        update_view();
    };

    //The "dob" attribute of an object for a mouse, is in the format "yyyymmdd" so it can be treated
    //as an integer for comparing if a date is earlier or later.
    var filter_min_date = filter_int_val.curry( function( a, b) { return a >= b; } );

    var filter_max_date = filter_int_val.curry( function( a, b) { return a <= b; } );

    var filter_min_age = function( id, attrName, tgtVal) {
        var tgtDate = age_to_date( tgtVal);
        // Mice born earlier than tgtDate are the desired older mice.
        filter_max_date( id, attrName, tgtDate);
    };

    var filter_max_age = function( id, attrName, tgtVal) {
        var tgtDate = age_to_date( tgtVal);
        // Mice born after tgtDate are the desired younger mice.
        filter_min_date( id, attrName, tgtDate);
    };

    var remove_filter = function( id) {
        plotConfig.formattedData.remove_filter( id);
        update_view();
    };


    //-- Provide functions that are visible to the parent directive, and through the
    //   parent becomes visible to other "sibling" directives.


    ctl[0].update_view = update_view;
    ctl[0].format_gender = format_gender;
    ctl[0].search_mouse = search_mouse;
    ctl[0].filter_value = filter_value;
    ctl[0].filter_min_date = filter_min_date;
    ctl[0].filter_max_date = filter_max_date;
    ctl[0].filter_min_age = filter_min_age;
    ctl[0].filter_max_age = filter_max_age;
    ctl[0].remove_filter = remove_filter;
    ctl[0].format_gender = format_gender;
    ctl[0].remove_format_gender = remove_format_gender;


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
    
            //The allMice object is an array of arrays for generation data, and element a json object.
            
            // Mice data format needs to support additional hierarchy such as by gender and litter.
            // Create an object that stores fxns that need to be applied to the original raw data
            // to achieve the filtering and grouping specified by user.
            plotConfig.formattedData = { 
                // format_fxns are functions that take one parameter - array of raw data objects
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

            create_initial_view( ); 
        }
    //).then(
    //    // Give the plot an initial grouping by gender.
    //    function() {
    //        plotConfig.formattedData.add_format( "genderCheck", create_gender_format);
    //        update_view(); 
    //    }
    );

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
