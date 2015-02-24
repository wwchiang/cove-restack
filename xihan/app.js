//File: cove-module.js
//Purpose: Used with the Angular framework to initialize and
//         associate logic with DOM display and interaction.

var colonyOptionsModule = angular.module('optionsColony',[]);
var plotModule = angular.module('colonyPlot', []);
var coveModule = angular.module('coveApp', ["ngRoute", "ui.bootstrap", "optionsColony", "colonyPlot"]);

coveModule.config(function($routeProvider) {
    $routeProvider
        .when("/colony", {templateUrl: "views/colony.html"})
        .when("/stats", {templateUrl: "views/stats.html"});
});

//Initialization
coveModule.controller("menuController", ['$scope', '$location', function($scope, $location) {
    3
    var set_selected_view = function() {
        $scope.selectedView = $location.url();
        if (!$scope.selectedView) {
            $scope.selectedView = "/colony";
        }
    };

    $scope.$on('$locationChangeSuccess', set_selected_view);
}]);

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
    function mice_data_format(data) {
        var dataFormatted = [];
        for (var i=0; i < data.length; i++) {
            dataFormatted.push({'name': 'Gen' + i, 'children': data[i]});
        }
        return dataFormatted;
    }


    var assign_default_color = function() { return "blue";};
	
    var assign_gender_color = function(d) {
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
    var set_scale_foci = function(nodeLayouts) {

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
        var totSpan = plotConfig.genFoci.reduce(function(prev, curr, i, array) {
            return prev + curr.radius * 2;
        }, 0)
        totSpan = totSpan + (genPadding * (nodeLayouts.length - 1));
        // Get max radius to scale the height.
        var maxRadius = plotConfig.genFoci.reduce(function(prev, curr, i, array) {
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
    var format_gender = function(id) {
        plotConfig.formattedData.add_format(id, function (rawNodes) {
            // Create additional grouping by gender
            var genderGroup = [];
            var femaleGrouping =  {'name': 'female',
                             'colorGroup': 'rgba(250,0,0,1)',
                             'children': rawNodes.filter(function(elem) { return elem.gender == "F"; })
            };
            if (femaleGrouping.children.length > 0) { genderGroup.push(femaleGrouping); }
    
            var maleGrouping =  {'name': 'male',
                             'colorGroup': 'rgba(0,0,250,1)',
                'children': rawNodes.filter(function(elem) { return elem.gender == "M"; })
            };
            if (maleGrouping.children.length > 0) { genderGroup.push(maleGrouping); }
    
            var unkGrouping =  {'name': 'unknown',
                             'colorGroup': 'rgba(150,150,150,0.9)',
                'children': rawNodes.filter(function(elem) { return (elem.gender != "M") && (elem.gender != "F"); })
            };
            if (unkGrouping.children.length > 0) { genderGroup.push(unkGrouping); }
    
            return genderGroup;
        });
        update_view();
    };


    var remove_format_gender = function(id) {
        plotConfig.formattedData.remove_format(id);
        update_view();
    };

    // Return an array of an array of objects that have data for position and size.
    var layout_generations = function (genArray) {
        // Use the circle packing layout to calculate node positions for each generation.
        var nodeLayouts = [];
        for (var i=0; i < genArray.length; i++) {
            // The size for packing is currently based on last boundary circle size
            nodeLayouts.push(d3.layout.pack().size([plotConfig.genFoci[i].radius * 2, scope.CV.height]).padding(10)
                    .value(function() { return 1;})
                    .nodes(genArray[i]));
        }
        return nodeLayouts;
    };


    //-- Event Callbacks


    // Callback when user hovers over a circle representing a mouse.
    function handle_mouseout(thisNode) {
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
    function handle_mouseover(thisNode) {
        if (thisNode.datum().mouseId) { //only highlight nodes, not hierarchy circles
            thisNode
                //.classed("hovered", true)
                .style("stroke", "rgb(250,250,0)")
                .style("stroke-width", "3px");
            //var endpoints = [];
            //CV.pathsDisplayed = CV.svg.selectAll("path.arrow").filter(function(d) {
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
            //var endpointNodes = d3.selectAll("#graph .node").filter(function(d) { 
            //    return endpoints.indexOf(d.mouseId) >= 0; });
            //endpointNodes
            //    .classed("hovered", true)
            //    .style("stroke", "rgb(250,250,0)")
            //    .style("stroke-width", "3px");
    
            ////show info on selected node
            //handle_hover_info(thisNode, "genHover");
        }
    }


    // Callback when user clicks on a circle that represents a mouse.
    //function handle_node_click(thisNode) {
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
    //        .attr("x", function(d) { return d.x;})
    //        .attr("y", function(d) { return d.y;});
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
    //                .style("stroke", "rgb(250,250,0)")
    //                .style("stroke-width", "3px");
    //            // removes all tooltips
    //            d3.selectAll(".lineageTooltip").remove();
    //            add_tooltip(hoverNode, "lineageTooltip"); 
    //            d3.selectAll(".lineageTooltip")
    //               .attr("transform", "translate(20,0) rotate(90)");
    //            //trigger highlight in main gen view
    //            matchMouse = d3.selectAll("#graph .node").filter(function(d) { 
    //                return d.mouseId == hoverNode.datum().mouseId; });
    //            handle_mouseover(matchMouse);
    //            })
    //        .on("click", function() {
    //            var thisNode = d3.select(this);
    //            handle_node_click(matchMouse);
    //        })
    //    // Update info header for number of children the selected mouse has
    //    IV.childInfoText.text("Children: " + thisNode.datum().numOffspring);
    //    // Find data belonging to children inside existing nodes in main graph
    //    var treeChildren = [];
    //    d3.selectAll("#graph .node").each(function(d) { 
    //        if (thisNode.datum().childIds.indexOf(d.mouseId) >= 0) {
    //            treeChildren.push(d);
    //        }
    //    });
    //    // Draw children
    //    var ypos = CV.infoYpos + IV.height - IV.childBlock + 30;
    //    var drawnLineage = IV.svgChildNodes.selectAll(".lineageNode")
    //        //.data(thisNode.datum().childIds)
    //        .data(treeChildren, function (d) {
    //            return d.mouseId ? d.mouseId : d.name; });
    //    var childRadius = 4.5;
    //    var nodesPerLine = Math.floor((IV.width - (childRadius*6))/(childRadius*4));
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
    //                .style("stroke", "rgb(250,250,0)")
    //                .style("stroke-width", "3px");
    //            // removes all tooltips
    //            d3.selectAll(".lineageTooltip").remove();
    //            add_tooltip(hoverNode, "lineageTooltip"); 
    //            //trigger highlight in main gen view
    //            matchMouse2 = d3.selectAll("#graph .node").filter(function(d) { 
    //                return d.mouseId == hoverNode.datum().mouseId; });
    //            handle_mouseover(matchMouse2);
    //            })
    //        .on("click", function() {
    //            var thisNode = d3.select(this);
    //            handle_node_click(matchMouse2);
    //        })
    //    drawnLineage.exit().remove();
    //}

    //Function to create elements for the plot.
    var create_initial_view = function () {

        //var divGraph = d3.select("#graph");
        var divGraph = d3.select(element[0]);
        divGraph.attr("height", scope.CV.height + 100)
            .attr("width", scope.CV.width + scope.CV.infoWidth + 150);
        scope.CV.svg = divGraph.append("svg")
                .attr("width", scope.CV.width)
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
        var nodeLayouts = layout_generations(nodeHierarchy);
		
        set_scale_foci(nodeLayouts);
    
        for (var i=0; i < nodeLayouts.length; i++) {
            var genGrp = scope.CV.svg.append("g").datum(i)
                    .attr("id","g" + i)
                    .attr("transform", "translate(" + plotConfig.genFoci[i].dx + ", " + plotConfig.genFoci[i].dy + ")");
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
                        handle_mouseover(thisNode);
                    })
                    .on("mouseout", function() {
                        var thisNode = d3.select(this);
                        handle_mouseout(thisNode);
            //        .on("click", function() {
            //            var thisNode = d3.select(this);
            //            if (thisNode.datum().mouseId) { //ignore hierarchy circles
            //                handle_node_click(thisNode);
            //            }
            //        })
            //        .on("dblclick", function() {
            //            var thisNode = d3.select(this);
            //            if (thisNode.datum().mouseId) { //ignore hierarchy circles
            //                window.location.href = scope.CV.href_individual(thisNode.datum().mouseId);
            //            }
                    });
        }
        scope.CV.svg.selectAll("g")
                .append("text")
                .attr("text-anchor", "middle")
                .text(function(d) { return "Gen" + d;})
                .attr("x", function(d) { return plotConfig.genFoci[d].x; })
                .attr("y", scope.CV.height - 25);
    
    };


    //Function to re-draw the plot based on changes to existing nodes
    //or adding nodes or grouping structure.
    var update_view = function () {
        
        var nodeHierarchy = plotConfig.formattedData.get_hierarchy();

        var nodeLayouts = layout_generations(nodeHierarchy);

        set_scale_foci(nodeLayouts);
        // Update the translation for each generation based on any change in genFoci and radii
        for (var i=0; i < nodeLayouts.length; i++) {
            d3.select("#g" + i).attr("transform","translate(" + plotConfig.genFoci[i].dx + ", " + plotConfig.genFoci[i].dy + ")");
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
                .style("fill", function(d) { return d.mouseId ? plotConfig.color_fxn(d) : "rgba(255,255,255,0)";});
            // Remove any hierarchy circles not needed
            genSelect.exit()
                .transition().duration(1200).style("stroke", "rgba(150, 150, 150, .2").remove();
            // Update nodes
            genSelect.each(function(nodeData) {
                var thisNode = d3.select(this);
                var thisTran = thisNode.transition()
                    .delay(700 * Math.pow(i, 1.5)).duration(1400 * Math.pow(i, 1.5))
                    .style("stroke", function(d) {
                        return typeof d.colorGroup !== 'undefined' ? d.colorGroup : "rgba(150,150,150,0.9)" })
                    .attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; })
                    .attr("r", function(d) { return plotConfig.fit_scale(d.r); });
                if (scope.CV.arrowReady) {
                    thisTran.transition().call(function() {
                        //var lines = find_endpoints(scope.CV.nodeLayout, scope.CV.genFoci);
                        //draw_arrows(scope.CV.svg, lines, AR.line_generator);
                    });
                    // Only execute once
                    scope.CV.arrowReady = false;
                }
                var colorOption = d3.select("#selectColorGroup").node();
                var colorBy = colorOption.options[colorOption.selectedIndex].value;
                var pieNode = d3.selectAll(".pie-" + nodeData.mouseId);
                if ((colorBy == "customGenotype") && !pieNode.empty()) {
                    pieNode.transition().delay(700 * Math.pow(i, 1.5)).duration(1400 * Math.pow(i, 1.5))
                        .attr("transform", "translate(" + nodeData.x + "," + nodeData.y + ")")
                        .style("opacity","1");
                    // check if the update has caused the size of the node to change
                    if (thisNode.attr("r") != plotConfig.fit_scale(nodeData.r)) {
                        scope.CV.arc.outerRadius(nodeData.r);
                        pieNode.selectAll("path").attr("d", scope.CV.arc);
                    }
                }
            });
        }
        d3.selectAll(".node")
          .on("mouseover", function() {handle_mouseover(d3.select(this)); })
          .on("mouseout", function() {handle_mouseout(d3.select(this)); });
          //.on("click", function() { handle_node_click(d3.select(this)); });
    };


    //Search for a given mouse, and highlight
    var search_mouse = function(searchId) {

        var foundMouse = d3.selectAll(".node").filter(function(d) {
            return d.mouseId == searchId; });
        if (!foundMouse.empty()) {
            handle_mouseover(foundMouse);
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
    var filter_value = function(id, attrName, attrVal) {
        //Clear any previous filter for the same id.
        plotConfig.formattedData.remove_filter(id);
        plotConfig.formattedData.add_filter(id,  function(item) {
            return item[attrName] == attrVal;
        });
        update_view();
    };


    var age_to_date = function(age) {
        // Convert age to a date
        var msDay = 24 * 60 * 60 * 1000;
        // Cannot be greater than tgtDate to meet min age
        var tgtDate = new Date(Date.now() - (age * msDay));
        var tgtYear = "" + tgtDate.getFullYear();
        var tgtMonth = tgtDate.getMonth() + 1;
        tgtMonth = tgtMonth > 9 ? "" + tgtMonth : "0" + tgtMonth;
        var tgtDay = tgtDate.getDate();
        tgtDay = tgtDay > 9 ? "" + tgtDay : "0" + tgtDay;
        return parseInt(tgtYear + tgtMonth + tgtDay);
    };


    //Filter the mice data.
    var filter_int_val = function(cmp_fxn, id, attrName, tgtVal) {

        //Clear any previous filter for the same id.
        plotConfig.formattedData.remove_filter(id);
        plotConfig.formattedData.add_filter(id,  function(item) {
            var res = false;
            var itemVal = parseInt(item[attrName]);
            itemVal = isNaN(itemVal) ? 0 : itemVal;
            // In case a low or hi limit value is not provided, default to true
            if (!tgtVal) {
               res = true;
            }
            else {
               res = cmp_fxn(itemVal, tgtVal);
            }
            return res;
        });
        update_view();
    };

    //The "dob" attribute of an object for a mouse, is in the format "yyyymmdd" so it can be treated
    //as an integer for comparing if a date is earlier or later.
    var filter_min_date = filter_int_val.curry(function(a, b) { return a >= b; });

    var filter_max_date = filter_int_val.curry(function(a, b) { return a <= b; });

    var filter_min_age = function(id, attrName, tgtVal) {
        var tgtDate = age_to_date(tgtVal);
        // Mice born earlier than tgtDate are the desired older mice.
        filter_max_date(id, attrName, tgtDate);
    };

    var filter_max_age = function(id, attrName, tgtVal) {
        var tgtDate = age_to_date(tgtVal);
        // Mice born after tgtDate are the desired younger mice.
        filter_min_date(id, attrName, tgtDate);
    };

    var remove_filter = function(id) {
        plotConfig.formattedData.remove_filter(id);
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
                'filteredHierarchy': mice_data_format(scope.CV.allMice),
                // format fxns add an additional level of grouping to leaf nodes
                'format_fxns': [],
                // filter functions take one parameter - a node to test
                'filter_fxns': [],
                // perform the grouping functions and return data in format for circle packing
                'get_hierarchy': function() {
                    // Recursive helper fxn
                    var that = this;
                    var applyFormat = function(parentName, currLevel, format_index) {
                        var innerHierarchy = [];
                        for (var ci=0; ci < currLevel.length; ci++) {
                            var formattedGroup =
                                // Ensure the group name is unique for the circles denoting a group, and not
                                // a node, ie. a female and male group will both have a group representing litter 1
                                {'name': parentName + currLevel[ci].name,
                                 'colorGroup': typeof currLevel[ci].colorGroup !== 'undefined' ?
                                    currLevel[ci].colorGroup : 'rgba(150,150,150,.9)',
                                 'children': that.format_fxns[format_index](currLevel[ci].children) };
                            // A depth first approach in recursion, in which the format_index
                            // corresponds to depth
                            if ((format_index + 1) < that.format_fxns.length) {
                                // Overwrite children array with additional hierarchy
                                formattedGroup.children = applyFormat(formattedGroup.name, formattedGroup.children, format_index + 1);
                            }
                            else {
                                // Modify the leaf 'name' with a parent prefix
                                for(var i=0; i < formattedGroup.children.length; i++) {
                                    formattedGroup.children[i].name = currLevel[ci].name + formattedGroup.children[i].name;
                                }
                            }
                            innerHierarchy.push(formattedGroup);
                        }
                        return innerHierarchy;
                    };
            
                    if(this.format_fxns.length > 0) {
                        // Recursively apply format
                        return applyFormat('',this.filteredHierarchy, 0);
                    }
                    else {
                        return this.filteredHierarchy;
                    }
                },
                // The id parameter needs to correlate with DOM checkbox that uses the 'fmt' function
                'add_format': function(id, fmt) {
                    // Attach the id as an attribute belonging to the fmt function object
                    fmt.id = id;
                    this.format_fxns.push(fmt);
                },
                'remove_format': function(id) {
                    this.format_fxns = this.format_fxns.filter(function(elem) { return elem.id != id; });
                },
                'add_filter': function(id, filterFxn) {
                    // Attach the id as an attribute belonging to the fmt function object
                    filterFxn.id = id;
                    this.filter_fxns.push(filterFxn);
                    //this.filteredHierarchy = mice_data_format(scope.CV.allMice);
                    // Apply additional filter
                    // Filters designate what *can* be displayed.
                    // Filter members of each generation
                    for (var g=0; g < this.filteredHierarchy.length; g++) {
                        this.filteredHierarchy[g].children = this.filteredHierarchy[g].children.filter(filterFxn); 
                    }
                },
                'remove_filter': function(id) {
                    this.filter_fxns = this.filter_fxns.filter(function(elem) { return elem.id != id; });
                    this.filteredHierarchy = mice_data_format(scope.CV.allMice);
                    // Re-Apply remaining filters
                    for (var fi=0; fi < this.filter_fxns.length; fi++) {
                        // Filter members of each generation
                        for (var g=0; g < this.filteredHierarchy.length; g++) {
                            this.filteredHierarchy[g].children = this.filteredHierarchy[g].children.filter(this.filter_fxns[fi]); 
                        }
                    }
                }
            };

            create_initial_view(); 
        }
    //).then(
    //    // Give the plot an initial grouping by gender.
    //    function() {
    //        plotConfig.formattedData.add_format("genderCheck", create_gender_format);
    //        update_view(); 
    //    }
   );

    //var lines = find_endpoints(scope.scope.CV.nodeLayout, scope.scope.CV.genFoci);
    //setTimeout(function() { draw_arrows(scope.scope.CV.svg, lines, AR.line_generator);}, 5000);

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

//File: colony-controller.js
//Purpose: 

plotModule.factory('initData', ['$http', function(http) {
    //Return a promise for the data.
    return http.get('/data?uid=1');
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
    function is_empty(obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                return false;
            }
        }
        return true;
    }
    
    
    // Function to declare initial values for dimensions and also some
    // data structures for use by the colony plot.
    var initialize = function (miceData) {
		
        //The allMice object is an array of arrays for generation data, and element a json object.
        //scope.CV.allMice = JSON.parse(miceData.trim());
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
            initialize(JSON.parse(result.data.data));
        },
        function(error) {
            console.error(error);
        });

}]);

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



colonyOptionsModule.controller('dateController', ['$scope', function(scope) {
    scope.dobStart = "";
    scope.dobEnd = "";
    scope.minNum = "";
    scope.maxNum = "";
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
                if(element.prop("checked")) {
                    ctl[0].format_gender("genderCheck");
                }
                else {
                    ctl[0].remove_format_gender("genderCheck");
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
                if(!success) {
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
                if(attrs["value"] === "All") {
                    ctl[0].remove_filter("filterGender");
                }
                else {
                    ctl[0].filter_value("filterGender", attrs["name"], attrs["value"]);
                }
            });
        }
    };
}]);

colonyOptionsModule.directive('filterMinDate', function() {
    return {
        restrict: 'A',
        require: ['^plotParent'],
        link: function(scope, element, attrs, ctl) {
            element.bind("change", function() {
                // Remove dashes from the date string.
                var selectedDate = element.val().replace(/-/g, "");
                ctl[0].filter_min_date("filterMinVal", attrs["namefiltered"], selectedDate);
            });
        }
    };
});

colonyOptionsModule.directive('filterMaxDate', function() {
    return {
        restrict: 'A',
        require: ['^plotParent'],
        link: function(scope, element, attrs, ctl) {
            element.bind("change", function() {
                // Remove dashes from the date string.
                var selectedDate = element.val().replace(/-/g, "");
                ctl[0].filter_max_date("filterMaxVal", attrs["namefiltered"], selectedDate);
            });
        }
    };
});

colonyOptionsModule.directive('filterMinAge', function() {
    return {
        restrict: 'A',
        require: ['^plotParent'],
        link: function(scope, element, attrs, ctl) {
            element.bind("input", function() {
                var selectedAge = parseInt(element.val());
                if (selectedAge) {
                    ctl[0].filter_min_age("filterMinVal", attrs["namefiltered"], selectedAge);
                }
            });
        }
    };
});

colonyOptionsModule.directive('filterMaxAge', function() {
    return {
        restrict: 'A',
        require: ['^plotParent'],
        link: function(scope, element, attrs, ctl) {
            element.bind("input", function() {
                var selectedAge = parseInt(element.val());
                if (selectedAge) {
                    ctl[0].filter_max_age("filterMaxVal", attrs["namefiltered"], selectedAge);
                }
            });
        }
    };
});

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

        optionsObj.dateFormat = 'yy-mm-dd';
        var updateModel = function(dateTxt) {
          scope.$apply(function () {
            // Call the internal AngularJS helper to
            // update the two-way binding
            ngModel.$setViewValue(dateTxt);
          });
          element.trigger("change");
        };

        optionsObj.onSelect = function(dateTxt, picker) {
          updateModel(dateTxt);
        };

        ngModel.$render = function() {
          // Use the AngularJS internal 'binding-specific' variable
          element.datepicker('setDate', ngModel.$viewValue || '');
        };
        element.datepicker(optionsObj);

        // Adjust background color and opacity of the calendar.
        $("#ui-datepicker-div")
            .css("background-color", "rgba(250, 250, 250, 1)")
            .click(function(event) {
                event.stopPropagation();
            });

      }
    };
  });

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvdmUtbW9kdWxlLmpzIiwiY29sb255L2NoaWxkLXBsb3QtZGlyZWN0aXZlLmpzIiwiY29sb255L2NvbG9ueS1jb250cm9sbGVyLmpzIiwiY29sb255L2NvbG9ueS1wYXJlbnQtZGlyZWN0aXZlLmpzIiwiY29sb255L29wdGlvbnMtY29sb255LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLHVCQUFBLGNBQUE7O0lBRUE7UUFDQTtRQUNBO1lBQ0E7UUFDQTtJQUNBOztJQUVBO0FBQ0E7O0FDekJBO0FBQ0E7OztBQUdBO0FBQ0E7O0lBRUE7SUFDQTs7SUFFQTtJQUNBOzs7SUFHQTs7O0lBR0E7SUFDQTtJQUNBO1FBQ0E7UUFDQTtZQUNBO1FBQ0E7UUFDQTtJQUNBOzs7SUFHQTs7SUFFQTtRQUNBO1lBQ0E7UUFDQTtRQUNBO1lBQ0E7UUFDQTtRQUNBO0lBQ0E7OztJQUdBO0lBQ0E7SUFDQTs7SUFFQTtJQUNBO0lBQ0E7SUFDQTs7UUFFQTtRQUNBO1lBQ0E7WUFDQTtnQkFDQTtvQkFDQTt3QkFDQTt3QkFDQTtvQkFDQTtnQkFDQTtZQUNBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1lBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtZQUNBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtRQUNBO0lBQ0E7OztJQUdBO0lBQ0E7UUFDQTtZQUNBO1lBQ0E7WUFDQTs2QkFDQTs2QkFDQTtZQUNBO1lBQ0E7O1lBRUE7NkJBQ0E7Z0JBQ0E7WUFDQTtZQUNBOztZQUVBOzZCQUNBO2dCQUNBO1lBQ0E7WUFDQTs7WUFFQTtRQUNBO1FBQ0E7SUFDQTs7O0lBR0E7UUFDQTtRQUNBO0lBQ0E7O0lBRUE7SUFDQTtRQUNBO1FBQ0E7UUFDQTtZQUNBO1lBQ0E7b0JBQ0E7b0JBQ0E7UUFDQTtRQUNBO0lBQ0E7OztJQUdBOzs7SUFHQTtJQUNBO1FBQ0E7V0FDQTtXQUNBO1dBQ0E7UUFDQTtZQUNBO2dCQUNBO2dCQUNBO1FBQ0E7SUFDQTs7SUFFQTtJQUNBO1FBQ0E7WUFDQTtnQkFDQTtnQkFDQTtnQkFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7O1lBRUE7WUFDQTtRQUNBO0lBQ0E7OztJQUdBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTs7SUFFQTtJQUNBOztRQUVBO1FBQ0E7UUFDQTtZQUNBO1FBQ0E7Z0JBQ0E7Z0JBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7O1FBRUE7WUFDQTtvQkFDQTtvQkFDQTtZQUNBO29CQUNBO29CQUNBO29CQUNBO29CQUNBO29CQUNBO29CQUNBO29CQUNBO29CQUNBO29CQUNBO29CQUNBO3dCQUNBO3dCQUNBOzRCQUNBO3dCQUNBO29CQUNBO1lBQ0E7b0JBQ0E7d0JBQ0E7d0JBQ0E7b0JBQ0E7b0JBQ0E7d0JBQ0E7d0JBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO29CQUNBO1FBQ0E7UUFDQTtnQkFDQTtnQkFDQTtnQkFDQTtnQkFDQTtnQkFDQTs7SUFFQTs7O0lBR0E7SUFDQTtJQUNBOztRQUVBOztRQUVBOztRQUVBO1FBQ0E7UUFDQTtZQUNBO1FBQ0E7UUFDQTtRQUNBO1lBQ0E7Z0JBQ0E7b0JBQ0E7WUFDQTtZQUNBO2dCQUNBO1lBQ0E7WUFDQTtZQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO1lBQ0E7WUFDQTtnQkFDQTtZQUNBO1lBQ0E7Z0JBQ0E7Z0JBQ0E7b0JBQ0E7b0JBQ0E7d0JBQ0E7b0JBQ0E7b0JBQ0E7b0JBQ0E7Z0JBQ0E7b0JBQ0E7d0JBQ0E7d0JBQ0E7b0JBQ0E7b0JBQ0E7b0JBQ0E7Z0JBQ0E7Z0JBQ0E7Z0JBQ0E7Z0JBQ0E7Z0JBQ0E7b0JBQ0E7d0JBQ0E7d0JBQ0E7b0JBQ0E7b0JBQ0E7d0JBQ0E7d0JBQ0E7b0JBQ0E7Z0JBQ0E7WUFDQTtRQUNBO1FBQ0E7VUFDQTtVQUNBO1VBQ0E7SUFDQTs7O0lBR0E7SUFDQTs7UUFFQTtZQUNBO1FBQ0E7WUFDQTtZQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO1lBQ0E7UUFDQTtRQUNBO1lBQ0E7UUFDQTtJQUNBOzs7SUFHQTtJQUNBO1FBQ0E7UUFDQTtRQUNBO1lBQ0E7UUFDQTtRQUNBO0lBQ0E7OztJQUdBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7SUFDQTs7O0lBR0E7SUFDQTs7UUFFQTtRQUNBO1FBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO2VBQ0E7WUFDQTtZQUNBO2VBQ0E7WUFDQTtZQUNBO1FBQ0E7UUFDQTtJQUNBOztJQUVBO0lBQ0E7SUFDQTs7SUFFQTs7SUFFQTtRQUNBO1FBQ0E7UUFDQTtJQUNBOztJQUVBO1FBQ0E7UUFDQTtRQUNBO0lBQ0E7O0lBRUE7UUFDQTtRQUNBO0lBQ0E7OztJQUdBO0lBQ0E7OztJQUdBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7OztJQUdBOztJQUVBO1FBQ0E7UUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQTtnQkFDQTtnQkFDQTtnQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtnQkFDQTtZQUNBOztZQUVBOztZQUVBO1lBQ0E7WUFDQTtZQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO2dCQUNBO29CQUNBO29CQUNBO29CQUNBO3dCQUNBO3dCQUNBOzRCQUNBO2dDQUNBO2dDQUNBO2dDQUNBO2lDQUNBO29DQUNBO2lDQUNBOzRCQUNBOzRCQUNBOzRCQUNBO2dDQUNBO2dDQUNBOzRCQUNBOzRCQUNBO2dDQUNBO2dDQUNBO29DQUNBO2dDQUNBOzRCQUNBOzRCQUNBO3dCQUNBO3dCQUNBO29CQUNBOztvQkFFQTt3QkFDQTt3QkFDQTtvQkFDQTtvQkFDQTt3QkFDQTtvQkFDQTtnQkFDQTtnQkFDQTtnQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtnQkFDQTtnQkFDQTtvQkFDQTtnQkFDQTtnQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTt3QkFDQTtvQkFDQTtnQkFDQTtnQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQTt3QkFDQTt3QkFDQTs0QkFDQTt3QkFDQTtvQkFDQTtnQkFDQTtZQUNBOztZQUVBO1FBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTs7SUFFQTtJQUNBOztBQUVBOztBQUVBO0FBQ0Esc0JBQUEsUUFBQTtJQUNBO1FBQ0E7UUFDQTtRQUNBO0lBQ0E7SUFDQTtBQUNBOztBQ3p0QkE7QUFDQTs7O0FBR0Esb0JBQUEsUUFBQTtJQUNBO0lBQ0E7QUFDQTs7QUFFQTtBQUNBLHVCQUFBLG9CQUFBOztJQUVBOztJQUVBO0lBQ0E7SUFDQTs7SUFFQTtJQUNBO1FBQ0E7Z0JBQ0E7Z0JBQ0E7UUFDQTtZQUNBO1FBQ0E7SUFDQTs7SUFFQTtJQUNBO1FBQ0E7WUFDQTtnQkFDQTtZQUNBO1FBQ0E7UUFDQTtJQUNBOzs7SUFHQTtJQUNBO0lBQ0E7O1FBRUE7UUFDQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBO1lBQ0E7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1lBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7SUFDQTs7SUFFQTtJQUNBO0lBQ0E7UUFDQTtZQUNBO1FBQ0E7UUFDQTtZQUNBO1FBQ0E7O0FBRUE7O0FDdEZBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUEsc0JBQUEsVUFBQTtJQUNBO1FBQ0E7UUFDQTtZQUNBO1FBQ0E7UUFDQTtJQUNBO0lBQ0E7QUFDQTs7OztBQ2ZBLGdDQUFBLGNBQUE7SUFDQTtJQUNBO0lBQ0E7SUFDQTtBQUNBOztBQUVBLCtCQUFBLGFBQUE7SUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7WUFDQTtRQUNBO1FBQ0E7SUFDQTtBQUNBOztBQUVBLCtCQUFBLFdBQUE7SUFDQTtRQUNBO1FBQ0E7UUFDQTtZQUNBO2dCQUNBO29CQUNBO2dCQUNBO2dCQUNBO29CQUNBO2dCQUNBO1lBQ0E7UUFDQTtJQUNBO0FBQ0E7O0FBRUEsK0JBQUEsU0FBQTtJQUNBO1FBQ0E7UUFDQTtRQUNBO1lBQ0E7Z0JBQ0E7Z0JBQ0E7b0JBQ0E7Z0JBQ0E7Z0JBQ0E7b0JBQ0E7Z0JBQ0E7WUFDQTtRQUNBO0lBQ0E7QUFDQTs7QUFFQSwrQkFBQSxZQUFBO0lBQ0E7UUFDQTtRQUNBO1FBQ0E7WUFDQTtnQkFDQTtvQkFDQTtnQkFDQTtnQkFDQTtvQkFDQTtnQkFDQTtZQUNBO1FBQ0E7SUFDQTtBQUNBOztBQUVBLCtCQUFBLGFBQUE7SUFDQTtRQUNBO1FBQ0E7UUFDQTtZQUNBO2dCQUNBO2dCQUNBO2dCQUNBO1lBQ0E7UUFDQTtJQUNBO0FBQ0E7O0FBRUEsK0JBQUEsYUFBQTtJQUNBO1FBQ0E7UUFDQTtRQUNBO1lBQ0E7Z0JBQ0E7Z0JBQ0E7Z0JBQ0E7WUFDQTtRQUNBO0lBQ0E7QUFDQTs7QUFFQSwrQkFBQSxZQUFBO0lBQ0E7UUFDQTtRQUNBO1FBQ0E7WUFDQTtnQkFDQTtnQkFDQTtvQkFDQTtnQkFDQTtZQUNBO1FBQ0E7SUFDQTtBQUNBOztBQUVBLCtCQUFBLFlBQUE7SUFDQTtRQUNBO1FBQ0E7UUFDQTtZQUNBO2dCQUNBO2dCQUNBO29CQUNBO2dCQUNBO1lBQ0E7UUFDQTtJQUNBO0FBQ0E7O0FBRUEsK0JBQUEsVUFBQTtJQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO1FBQ0E7UUFDQTtRQUNBOzJCQUNBO01BQ0E7TUFDQTtRQUNBOztRQUVBOztRQUVBO1FBQ0E7VUFDQTtZQUNBO1lBQ0E7WUFDQTtVQUNBO1VBQ0E7UUFDQTs7UUFFQTtVQUNBO1FBQ0E7O1FBRUE7VUFDQTtVQUNBO1FBQ0E7UUFDQTs7UUFFQTtRQUNBO1lBQ0E7WUFDQTtnQkFDQTtZQUNBOztNQUVBO0lBQ0E7RUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvL0ZpbGU6IGNvdmUtbW9kdWxlLmpzXG4vL1B1cnBvc2U6IFVzZWQgd2l0aCB0aGUgQW5ndWxhciBmcmFtZXdvcmsgdG8gaW5pdGlhbGl6ZSBhbmRcbi8vICAgICAgICAgYXNzb2NpYXRlIGxvZ2ljIHdpdGggRE9NIGRpc3BsYXkgYW5kIGludGVyYWN0aW9uLlxuXG52YXIgY29sb255T3B0aW9uc01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCdvcHRpb25zQ29sb255JyxbXSk7XG52YXIgcGxvdE1vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCdjb2xvbnlQbG90JywgW10pO1xudmFyIGNvdmVNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgnY292ZUFwcCcsIFtcIm5nUm91dGVcIiwgXCJ1aS5ib290c3RyYXBcIiwgXCJvcHRpb25zQ29sb255XCIsIFwiY29sb255UGxvdFwiXSk7XG5cbi8vY292ZU1vZHVsZS5jb25maWcoIGZ1bmN0aW9uKCRyb3V0ZVByb3ZpZGVyKSB7XG4vLyAgICAkcm91dGVQcm92aWRlclxuLy8gICAgICAgIC53aGVuKFwiL2NvbG9ueVwiLCB7dGVtcGxhdGVVcmw6IFwidmlld3MvY29sb255Lmh0bWxcIn0pXG4vLyAgICAgICAgLndoZW4oXCIvc3RhdHNcIiwge3RlbXBsYXRlVXJsOiBcInZpZXdzL3N0YXRzLmh0bWxcIn0pO1xuLy99KTtcblxuLy9Jbml0aWFsaXphdGlvblxuY292ZU1vZHVsZS5jb250cm9sbGVyKFwibWVudUNvbnRyb2xsZXJcIiwgWyckc2NvcGUnLCAnJGxvY2F0aW9uJywgZnVuY3Rpb24oJHNjb3BlLCAkbG9jYXRpb24pIHtcbiAgICBcbiAgICB2YXIgc2V0X3NlbGVjdGVkX3ZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkVmlldyA9ICRsb2NhdGlvbi51cmwoKTtcbiAgICAgICAgaWYgKCEkc2NvcGUuc2VsZWN0ZWRWaWV3KSB7XG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRWaWV3ID0gXCIvY29sb255XCI7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJHNjb3BlLiRvbiggJyRsb2NhdGlvbkNoYW5nZVN1Y2Nlc3MnLCBzZXRfc2VsZWN0ZWRfdmlldyApO1xufV0pO1xuIiwiLy9GaWxlOiBjaGlsZC1wbG90LWRpcmVjdGl2ZS5qc1xuLy9QdXJwb3NlOlxuXG5cbi8vVGhlIGxpbmsgZnVuY3Rpb24gZm9yIHRoZSBkaXJlY3RpdmUgXCJkM2NvbG9ueVwiLiBcbnZhciBjaGlsZF9wbG90X2xpbmsgPSBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0bCkge1xuXG4gICAgLy8gSG9sZGVyIGZvciB0aGUgdmFsdWVzIHRoYXQgYWZmZWN0IHBsb3QgZmVhdHVyZXMgZm9yIGNvbG9yLCBncm91cGluZywuLi5cbiAgICB2YXIgcGxvdENvbmZpZyA9IHt9O1xuXG4gICAgLy9UaGUgY29vcmRpbmF0ZXMgb2YgdGhlIGNlbnRlciBvZiBlYWNoIGNpcmNsZSB0aGF0IHJlcHJlc2VudHMgYSBnZW5lcmF0aW9uIGdyb3VwLlxuICAgIHBsb3RDb25maWcuZ2VuRm9jaSA9IFtdO1xuXG5cbiAgICAvLy0tIEhlbHBlciBmdW5jdGlvbnNcblxuXG4gICAgLy8gRnVuY3Rpb24gdG8gY3JlYXRlIHRoZSBtaW5pbWFsIG9iamVjdCBzdHJ1Y3R1cmUgbmVlZGVkIGZvciBjaXJjbGUgcGFja2luZy5cbiAgICAvL0NvbnZlcnQgdG8gZm9ybWF0IGZvciBoaWVyYXJjaGljYWwgcGFja2luZyAoMSBsZXZlbCBwZXIgZ2VuZXJhdGlvbikuXG4gICAgZnVuY3Rpb24gbWljZV9kYXRhX2Zvcm1hdCggZGF0YSkge1xuICAgICAgICB2YXIgZGF0YUZvcm1hdHRlZCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBkYXRhRm9ybWF0dGVkLnB1c2goIHsnbmFtZSc6ICdHZW4nICsgaSwgJ2NoaWxkcmVuJzogZGF0YVtpXX0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhRm9ybWF0dGVkO1xuICAgIH1cblxuXG4gICAgdmFyIGFzc2lnbl9kZWZhdWx0X2NvbG9yID0gZnVuY3Rpb24oKSB7IHJldHVybiBcImdyZXlcIjt9O1xuXG4gICAgdmFyIGFzc2lnbl9nZW5kZXJfY29sb3IgPSBmdW5jdGlvbiggZCkge1xuICAgICAgICBpZihkLmdlbmRlciA9PSBcIkZcIikge1xuICAgICAgICAgICAgcmV0dXJuIFwiI0ZGNzU3NVwiO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGQuZ2VuZGVyID09IFwiTVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gXCIjMzM2NkZGXCI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSByZXR1cm4gXCIjQzBDMEMwXCI7XG4gICAgfVxuXG4gICAgXG4gICAgLy9UaGUgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIHVzZWQgdG8gZGV0ZXJtaW5lIGNvbG9yIG9mIG5vZGVzLlxuICAgIC8vRGVmYXVsdCBpcyBncmV5LlxuICAgIHBsb3RDb25maWcuY29sb3JfZnhuID0gYXNzaWduX2RlZmF1bHRfY29sb3I7XG5cbiAgICAvLyBUaGUgbGF5b3V0IG9mIHBhY2tlZCBjaXJjbGVzIHdhcyBiYXNlZCBvbiBhbiBhcmJpdHJhcnkgc2l6ZSBmb3IgdGhlIHNtYWxsZXN0IGNpcmNsZS5cbiAgICAvLyBFdmVyeXRoaW5nIHRoZW4gbmVlZHMgdG8gYmUgc2NhbGVkIHRvIG1hdGNoIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBwbG90LlxuICAgIC8vIEFzc2lnbiB2YWx1ZXMgdG8gdGhlIGZpdF9zY2FsZSBmdW5jdGlvbiBhbmQgZ2VuRm9jaSBwb3NpdGlvbnMuXG4gICAgdmFyIHNldF9zY2FsZV9mb2NpID0gZnVuY3Rpb24oIG5vZGVMYXlvdXRzKSB7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBob3Jpem9udGFsIHNwYWNpbmcgZm9yIGVhY2ggZ2VuZXJhdGlvbiBiYXNlZCBvbiByb290IG5vZGUgcmFkaXVzLlxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBub2RlTGF5b3V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGN1cnJHZW4gPSBub2RlTGF5b3V0c1tpXTtcbiAgICAgICAgICAgIGZvciAodmFyIGo9MDsgaiA8IGN1cnJHZW4ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoY3VyckdlbltqXS5kZXB0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBwbG90Q29uZmlnLmdlbkZvY2lbaV0gPSB7J3JhZGl1cyc6IGN1cnJHZW5bal0ucixcbiAgICAgICAgICAgICAgICAgICAgICAgICd4JzogY3VyckdlbltqXS54LFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3knOiBjdXJyR2VuW2pdLnl9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgdmFyIGdlblBhZGRpbmcgPSAyNTtcbiAgICAgICAgLy8gQWRkIGRpYW1ldGVyIG9mIGVhY2ggZ2VuZXJhdGlvbiB0byBzY2FsZSB3aWR0aC5cbiAgICAgICAgdmFyIHRvdFNwYW4gPSBwbG90Q29uZmlnLmdlbkZvY2kucmVkdWNlKCBmdW5jdGlvbiggcHJldiwgY3VyciwgaSwgYXJyYXkpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2ICsgY3Vyci5yYWRpdXMgKiAyO1xuICAgICAgICB9LCAwKVxuICAgICAgICB0b3RTcGFuID0gdG90U3BhbiArIChnZW5QYWRkaW5nICogKG5vZGVMYXlvdXRzLmxlbmd0aCAtIDEpKTtcbiAgICAgICAgLy8gR2V0IG1heCByYWRpdXMgdG8gc2NhbGUgdGhlIGhlaWdodC5cbiAgICAgICAgdmFyIG1heFJhZGl1cyA9IHBsb3RDb25maWcuZ2VuRm9jaS5yZWR1Y2UoIGZ1bmN0aW9uKCBwcmV2LCBjdXJyLCBpLCBhcnJheSkge1xuICAgICAgICAgICAgcmV0dXJuIChwcmV2IDwgY3Vyci5yYWRpdXMpID8gY3Vyci5yYWRpdXMgOiBwcmV2O1xuICAgICAgICB9LCAwKVxuICAgIFxuICAgICAgICAvLyBDcmVhdGUgc2NhbGUgZnVuY3Rpb25cbiAgICAgICAgdmFyIHhfc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWzAsIHRvdFNwYW5dKS5yYW5nZShbMCwgc2NvcGUuQ1Yud2lkdGhdKTtcbiAgICAgICAgdmFyIHlfc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWzAsIG1heFJhZGl1cyoyXSkucmFuZ2UoWzAsIHNjb3BlLkNWLmhlaWdodF0pO1xuICAgICAgICBwbG90Q29uZmlnLmZpdF9zY2FsZSA9ICh4X3NjYWxlKG1heFJhZGl1cykgPCB5X3NjYWxlKG1heFJhZGl1cykpID8geF9zY2FsZSA6IHlfc2NhbGU7XG4gICAgXG4gICAgICAgIC8vIEFzc2lnbiBmb2NpIHZhbHVlc1xuICAgICAgICB2YXIgcnVubmluZ1N1bSA9IDA7IC8vIEtlZXAgdHJhY2sgb2Ygb2Zmc2V0IGZyb20gbGVmdCBvZiBncmFwaFxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBwbG90Q29uZmlnLmdlbkZvY2kubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzY2FsZWRSYWRpdXMgPSBwbG90Q29uZmlnLmZpdF9zY2FsZShwbG90Q29uZmlnLmdlbkZvY2lbaV0ucmFkaXVzKTtcbiAgICAgICAgICAgIHBsb3RDb25maWcuZ2VuRm9jaVtpXS5yYWRpdXMgPSBzY2FsZWRSYWRpdXM7XG4gICAgICAgICAgICBwbG90Q29uZmlnLmdlbkZvY2lbaV0uZHggPSBydW5uaW5nU3VtICsgc2NhbGVkUmFkaXVzIC0gcGxvdENvbmZpZy5nZW5Gb2NpW2ldLng7XG4gICAgICAgICAgICBwbG90Q29uZmlnLmdlbkZvY2lbaV0uZHkgPSAwO1xuICAgICAgICAgICAgcnVubmluZ1N1bSA9IHJ1bm5pbmdTdW0gKyBnZW5QYWRkaW5nICsgKHNjYWxlZFJhZGl1cyAqIDIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcblxuICAgIC8vIEZvcm1hdCBtaWNlIGRhdGEgdG8gaGF2ZSBoaWVyYXJjaHkgb2YgZ2VuZXJhdGlvbiB0aGVuIGdlbmRlciB0eXBlXG4gICAgdmFyIGZvcm1hdF9nZW5kZXIgPSBmdW5jdGlvbiggaWQpIHtcbiAgICAgICAgcGxvdENvbmZpZy5mb3JtYXR0ZWREYXRhLmFkZF9mb3JtYXQoIGlkLCBmdW5jdGlvbiAoIHJhd05vZGVzKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYWRkaXRpb25hbCBncm91cGluZyBieSBnZW5kZXJcbiAgICAgICAgICAgIHZhciBnZW5kZXJHcm91cCA9IFtdO1xuICAgICAgICAgICAgdmFyIGZlbWFsZUdyb3VwaW5nID0gIHsnbmFtZSc6ICdmZW1hbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29sb3JHcm91cCc6ICdyZ2JhKDI1MCwwLDAsMSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY2hpbGRyZW4nOiByYXdOb2Rlcy5maWx0ZXIoIGZ1bmN0aW9uKCBlbGVtKSB7IHJldHVybiBlbGVtLmdlbmRlciA9PSBcIkZcIjsgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoZmVtYWxlR3JvdXBpbmcuY2hpbGRyZW4ubGVuZ3RoID4gMCkgeyBnZW5kZXJHcm91cC5wdXNoKCBmZW1hbGVHcm91cGluZyk7IH1cbiAgICBcbiAgICAgICAgICAgIHZhciBtYWxlR3JvdXBpbmcgPSAgeyduYW1lJzogJ21hbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29sb3JHcm91cCc6ICdyZ2JhKDAsMCwyNTAsMSknLFxuICAgICAgICAgICAgICAgICdjaGlsZHJlbic6IHJhd05vZGVzLmZpbHRlciggZnVuY3Rpb24oIGVsZW0pIHsgcmV0dXJuIGVsZW0uZ2VuZGVyID09IFwiTVwiOyB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChtYWxlR3JvdXBpbmcuY2hpbGRyZW4ubGVuZ3RoID4gMCkgeyBnZW5kZXJHcm91cC5wdXNoKCBtYWxlR3JvdXBpbmcpOyB9XG4gICAgXG4gICAgICAgICAgICB2YXIgdW5rR3JvdXBpbmcgPSAgeyduYW1lJzogJ3Vua25vd24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29sb3JHcm91cCc6ICdyZ2JhKDE1MCwxNTAsMTUwLDAuOSknLFxuICAgICAgICAgICAgICAgICdjaGlsZHJlbic6IHJhd05vZGVzLmZpbHRlciggZnVuY3Rpb24oIGVsZW0pIHsgcmV0dXJuIChlbGVtLmdlbmRlciAhPSBcIk1cIikgJiYgKGVsZW0uZ2VuZGVyICE9IFwiRlwiKTsgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAodW5rR3JvdXBpbmcuY2hpbGRyZW4ubGVuZ3RoID4gMCkgeyBnZW5kZXJHcm91cC5wdXNoKCB1bmtHcm91cGluZyk7IH1cbiAgICBcbiAgICAgICAgICAgIHJldHVybiBnZW5kZXJHcm91cDtcbiAgICAgICAgfSk7XG4gICAgICAgIHVwZGF0ZV92aWV3KCk7XG4gICAgfTtcblxuXG4gICAgdmFyIHJlbW92ZV9mb3JtYXRfZ2VuZGVyID0gZnVuY3Rpb24oIGlkKSB7XG4gICAgICAgIHBsb3RDb25maWcuZm9ybWF0dGVkRGF0YS5yZW1vdmVfZm9ybWF0KCBpZCk7XG4gICAgICAgIHVwZGF0ZV92aWV3KCk7XG4gICAgfTtcblxuICAgIC8vIFJldHVybiBhbiBhcnJheSBvZiBhbiBhcnJheSBvZiBvYmplY3RzIHRoYXQgaGF2ZSBkYXRhIGZvciBwb3NpdGlvbiBhbmQgc2l6ZS5cbiAgICB2YXIgbGF5b3V0X2dlbmVyYXRpb25zID0gZnVuY3Rpb24gKCBnZW5BcnJheSkge1xuICAgICAgICAvLyBVc2UgdGhlIGNpcmNsZSBwYWNraW5nIGxheW91dCB0byBjYWxjdWxhdGUgbm9kZSBwb3NpdGlvbnMgZm9yIGVhY2ggZ2VuZXJhdGlvbi5cbiAgICAgICAgdmFyIG5vZGVMYXlvdXRzID0gW107XG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGdlbkFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBUaGUgc2l6ZSBmb3IgcGFja2luZyBpcyBjdXJyZW50bHkgYmFzZWQgb24gbGFzdCBib3VuZGFyeSBjaXJjbGUgc2l6ZVxuICAgICAgICAgICAgbm9kZUxheW91dHMucHVzaCggZDMubGF5b3V0LnBhY2soKS5zaXplKFtwbG90Q29uZmlnLmdlbkZvY2lbaV0ucmFkaXVzICogMiwgc2NvcGUuQ1YuaGVpZ2h0XSkucGFkZGluZygxMClcbiAgICAgICAgICAgICAgICAgICAgLnZhbHVlKCBmdW5jdGlvbigpIHsgcmV0dXJuIDE7fSlcbiAgICAgICAgICAgICAgICAgICAgLm5vZGVzKCBnZW5BcnJheVtpXSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub2RlTGF5b3V0cztcbiAgICB9O1xuXG5cbiAgICAvLy0tIEV2ZW50IENhbGxiYWNrc1xuXG5cbiAgICAvLyBDYWxsYmFjayB3aGVuIHVzZXIgaG92ZXJzIG92ZXIgYSBjaXJjbGUgcmVwcmVzZW50aW5nIGEgbW91c2UuXG4gICAgZnVuY3Rpb24gaGFuZGxlX21vdXNlb3V0KCB0aGlzTm9kZSkge1xuICAgICAgICB0aGlzTm9kZVxuICAgICAgICAgICAvLy5jbGFzc2VkKFwiaG92ZXJlZFwiLCBmYWxzZSlcbiAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIFwicmdiKDE1MCwgMTUwLCAxNTApXCIpXG4gICAgICAgICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCBcIjEuMHB4XCIpO1xuICAgICAgICBpZiAoc2NvcGUuQ1YucGF0aHNEaXNwbGF5ZWQpIHtcbiAgICAgICAgICAgIHNjb3BlLkNWLnBhdGhzRGlzcGxheWVkXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJwYXRoSG92ZXJlZFwiLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2VcIiwgXCJyZ2JhKDI1NSwyNTUsMjU1LDApXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2FsbGJhY2sgd2hlbiB1c2VyIGhvdmVycyBvdmVyIGEgY2lyY2xlIHJlcHJlc2VudGluZyBhIG1vdXNlLlxuICAgIGZ1bmN0aW9uIGhhbmRsZV9tb3VzZW92ZXIoIHRoaXNOb2RlKSB7XG4gICAgICAgIGlmICh0aGlzTm9kZS5kYXR1bSgpLm1vdXNlSWQpIHsgLy9vbmx5IGhpZ2hsaWdodCBub2Rlcywgbm90IGhpZXJhcmNoeSBjaXJjbGVzXG4gICAgICAgICAgICB0aGlzTm9kZVxuICAgICAgICAgICAgICAgIC8vLmNsYXNzZWQoXCJob3ZlcmVkXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgLnN0eWxlKCBcInN0cm9rZVwiLCBcInJnYigyNTAsMjUwLDApXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIFwiM3B4XCIpO1xuICAgICAgICAgICAgLy92YXIgZW5kcG9pbnRzID0gW107XG4gICAgICAgICAgICAvL0NWLnBhdGhzRGlzcGxheWVkID0gQ1Yuc3ZnLnNlbGVjdEFsbChcInBhdGguYXJyb3dcIikuZmlsdGVyKCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAvLyAgICBpZiAoZFswXS5pZCA9PSB0aGlzTm9kZS5kYXR1bSgpLm1vdXNlSWQpIHsgXG4gICAgICAgICAgICAvLyAgICAgICAgLy8gc2F2ZSBpZHMgdGhhdCBhcmUgYXQgb3RoZXIgZW5kIG9mIGFycm93c1xuICAgICAgICAgICAgLy8gICAgICAgIGVuZHBvaW50cy5wdXNoKGRbMl0uaWQpO1xuICAgICAgICAgICAgLy8gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgLy8gICAgfVxuICAgICAgICAgICAgLy8gICAgZWxzZSBpZiAoZFsyXS5pZCA9PSB0aGlzTm9kZS5kYXR1bSgpLm1vdXNlSWQpICB7XG4gICAgICAgICAgICAvLyAgICAgICAgZW5kcG9pbnRzLnB1c2goZFswXS5pZCk7XG4gICAgICAgICAgICAvLyAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAvLyAgICB9XG4gICAgICAgICAgICAvLyAgICBlbHNlIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIC8vfSk7XG4gICAgICAgICAgICAvL0NWLnBhdGhzRGlzcGxheWVkXG4gICAgICAgICAgICAvLyAgICAgICAgLmNsYXNzZWQoXCJwYXRoSG92ZXJlZFwiLCB0cnVlKVxuICAgICAgICAgICAgLy8gICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBcInJnYmEoMTMwLDIzMCwxOTAsMC41KVwiKTtcbiAgICAgICAgICAgIC8vLy8gSGlnaGxpZ2h0IHRoZSBlbmRwb2ludHMgb2YgYXJyb3dzXG4gICAgICAgICAgICAvL3ZhciBlbmRwb2ludE5vZGVzID0gZDMuc2VsZWN0QWxsKFwiI2dyYXBoIC5ub2RlXCIpLmZpbHRlciggZnVuY3Rpb24oZCkgeyBcbiAgICAgICAgICAgIC8vICAgIHJldHVybiBlbmRwb2ludHMuaW5kZXhPZihkLm1vdXNlSWQpID49IDA7IH0gKTtcbiAgICAgICAgICAgIC8vZW5kcG9pbnROb2Rlc1xuICAgICAgICAgICAgLy8gICAgLmNsYXNzZWQoXCJob3ZlcmVkXCIsIHRydWUpXG4gICAgICAgICAgICAvLyAgICAuc3R5bGUoIFwic3Ryb2tlXCIsIFwicmdiKDI1MCwyNTAsMClcIilcbiAgICAgICAgICAgIC8vICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCBcIjNweFwiKTtcbiAgICBcbiAgICAgICAgICAgIC8vLy9zaG93IGluZm8gb24gc2VsZWN0ZWQgbm9kZVxuICAgICAgICAgICAgLy9oYW5kbGVfaG92ZXJfaW5mbyggdGhpc05vZGUsIFwiZ2VuSG92ZXJcIik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8vIENhbGxiYWNrIHdoZW4gdXNlciBjbGlja3Mgb24gYSBjaXJjbGUgdGhhdCByZXByZXNlbnRzIGEgbW91c2UuXG4gICAgLy9mdW5jdGlvbiBoYW5kbGVfbm9kZV9jbGljayggdGhpc05vZGUpIHtcbiAgICAvLyAgICB2YXIgbm9kZXMgPSBJVi50cmVlLm5vZGVzKHRoaXNOb2RlLmRhdHVtKCkubGluZWFnZSk7XG4gICAgLy8gICAgdmFyIGxpbmtzID0gSVYudHJlZS5saW5rcyhub2Rlcyk7XG4gICAgLy8gICAgdmFyIGdyYXBoID0gZDMuc2VsZWN0KFwiI2xpbmVhZ2VHcmFwaFwiKTtcbiAgICAvLyAgICAvLyBjbGVhbnVwIHByZXZpb3VzIGRyYXdpbmdcbiAgICAvLyAgICBJVi5zdmcuc2VsZWN0QWxsKFwiLmxpbmVhZ2VOb2RlXCIpLnJlbW92ZSgpO1xuICAgIC8vICAgIElWLnN2Zy5zZWxlY3RBbGwoXCIubGlua1wiKS5yZW1vdmUoKTtcbiAgICAvLyAgICBkMy5zZWxlY3RBbGwoXCIubGluZWFnZVRvb2x0aXBcIikucmVtb3ZlKCk7XG4gICAgLy9cbiAgICAvLyAgICAvLyBVcGRhdGUgaGVhZGluZyBhYm92ZSBsaW5lYWdlIHRyZWVcbiAgICAvLyAgICBJVi5pbmZvVGV4dC50ZXh0KFwiTGluZWFnZSB0cmVlIGZvciBtb3VzZSBcIiArIHRoaXNOb2RlLmRhdHVtKCkubW91c2VJZCk7XG4gICAgLy8gICAgSVYuaW5mb1RleHQuc3R5bGUoXCJmb250LXN0eWxlXCIsIFwibm9ybWFsXCIpO1xuICAgIC8vXG4gICAgLy8gICAgLy8gQ3JlYXRlIGxpbmVhZ2UgdHJlZVxuICAgIC8vICAgIHZhciBsaW5rID0gSVYuc3ZnLnNlbGVjdEFsbChcIi5saW5rXCIpXG4gICAgLy8gICAgICAgIC5kYXRhKGxpbmtzKVxuICAgIC8vICAgICAgLmVudGVyKClcbiAgICAvLyAgICBcdC5hcHBlbmQoXCJwYXRoXCIpXG4gICAgLy8gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXG4gICAgLy8gICAgICAgIC5zdHlsZShcImZpbGxcIiwgXCJub25lXCIpXG4gICAgLy8gICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBcIiNjY2NjY2NcIilcbiAgICAvLyAgICAgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIFwiMS41cHhcIilcbiAgICAvLyAgICAgICAgLmF0dHIoXCJkXCIsIElWLmRpYWdvbmFsKTtcbiAgICAvLyAgICBcbiAgICAvLyAgICB2YXIgbm9kZUVsZW1lbnRzID0gSVYuc3ZnLnNlbGVjdEFsbChcIi5saW5lYWdlTm9kZVwiKVxuICAgIC8vICAgICAgICAuZGF0YShub2RlcylcbiAgICAvLyAgICAgIC5lbnRlcigpLmFwcGVuZChcImdcIilcbiAgICAvLyAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmVhZ2VOb2RlXCIpXG4gICAgLy8gICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgZC55ICsgXCIsXCIgKyBkLnggKyBcIilcIjsgfSlcbiAgICAvLyAgICAgICAgLy8gTWFrZSBhYnNvbHV0ZSBwb3NpdGlvbiBpbmZvIGVhc2llciB0byBhY2Nlc3MgZm9yIGNoaWxkIGVsZW1lbnRzIHRoYXQgbWFpbnRhaW4gcmVsYXRpdmUgcG9zaXRpb24uXG4gICAgLy8gICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiggZCkgeyByZXR1cm4gZC54O30pXG4gICAgLy8gICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbiggZCkgeyByZXR1cm4gZC55O30pO1xuICAgIC8vICAgIFxuICAgIC8vICAgIHZhciBtYXRjaE1vdXNlO1xuICAgIC8vICAgIG5vZGVFbGVtZW50cy5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAvLyAgICAgICAgLmF0dHIoXCJyXCIsIDQuNSlcbiAgICAvLyAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkKSB7XG4gICAgLy8gICAgICAgICAgICBpZihkLmdlbmRlciA9PSBcIkZcIikge1xuICAgIC8vICAgICAgICAgICAgICAgIHJldHVybiBcIiNGRjc1NzVcIjtcbiAgICAvLyAgICAgICAgICAgIH1cbiAgICAvLyAgICAgICAgICAgIGVsc2UgaWYgKGQuZ2VuZGVyID09IFwiTVwiKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgcmV0dXJuIFwiIzMzNjZGRlwiO1xuICAgIC8vICAgICAgICAgICAgfVxuICAgIC8vICAgICAgICAgICAgZWxzZSByZXR1cm4gXCIjQzBDMEMwXCI7XG4gICAgLy8gICAgICAgIH0pXG4gICAgLy8gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgICAgICAgIC8vdW5kbyBhbnkgcHJldmlvdXMgc2VsZWN0aW9uXG4gICAgLy8gICAgICAgICAgICBkMy5zZWxlY3QoXCIubGluZWFnZUhvdmVyZWRcIilcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJsaW5lYWdlSG92ZXJlZFwiLCBmYWxzZSlcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIFwicmdiKDE1MCwgMTUwLCAxNTApXCIpXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCBcIjEuMHB4XCIpO1xuICAgIC8vICAgICAgICAgICAgdmFyIGhvdmVyTm9kZSA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAvLyAgICAgICAgICAgIGhvdmVyTm9kZS5jbGFzc2VkKFwibGluZWFnZUhvdmVyZWRcIiwgdHJ1ZSlcbiAgICAvLyAgICAgICAgICAgICAgICAuc3R5bGUoIFwic3Ryb2tlXCIsIFwicmdiKDI1MCwyNTAsMClcIilcbiAgICAvLyAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgXCIzcHhcIik7XG4gICAgLy8gICAgICAgICAgICAvLyByZW1vdmVzIGFsbCB0b29sdGlwc1xuICAgIC8vICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiLmxpbmVhZ2VUb29sdGlwXCIpLnJlbW92ZSgpO1xuICAgIC8vICAgICAgICAgICAgYWRkX3Rvb2x0aXAoIGhvdmVyTm9kZSwgXCJsaW5lYWdlVG9vbHRpcFwiKTsgXG4gICAgLy8gICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCIubGluZWFnZVRvb2x0aXBcIilcbiAgICAvLyAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDIwLDApIHJvdGF0ZSg5MClcIik7XG4gICAgLy8gICAgICAgICAgICAvL3RyaWdnZXIgaGlnaGxpZ2h0IGluIG1haW4gZ2VuIHZpZXdcbiAgICAvLyAgICAgICAgICAgIG1hdGNoTW91c2UgPSBkMy5zZWxlY3RBbGwoXCIjZ3JhcGggLm5vZGVcIikuZmlsdGVyKCBmdW5jdGlvbihkKSB7IFxuICAgIC8vICAgICAgICAgICAgICAgIHJldHVybiBkLm1vdXNlSWQgPT0gaG92ZXJOb2RlLmRhdHVtKCkubW91c2VJZDsgfSApO1xuICAgIC8vICAgICAgICAgICAgaGFuZGxlX21vdXNlb3ZlciggbWF0Y2hNb3VzZSk7XG4gICAgLy8gICAgICAgICAgICB9KVxuICAgIC8vICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgICAgICAgIHZhciB0aGlzTm9kZSA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAvLyAgICAgICAgICAgIGhhbmRsZV9ub2RlX2NsaWNrKCBtYXRjaE1vdXNlKTtcbiAgICAvLyAgICAgICAgfSlcbiAgICAvLyAgICAvLyBVcGRhdGUgaW5mbyBoZWFkZXIgZm9yIG51bWJlciBvZiBjaGlsZHJlbiB0aGUgc2VsZWN0ZWQgbW91c2UgaGFzXG4gICAgLy8gICAgSVYuY2hpbGRJbmZvVGV4dC50ZXh0KFwiQ2hpbGRyZW46IFwiICsgdGhpc05vZGUuZGF0dW0oKS5udW1PZmZzcHJpbmcpO1xuICAgIC8vICAgIC8vIEZpbmQgZGF0YSBiZWxvbmdpbmcgdG8gY2hpbGRyZW4gaW5zaWRlIGV4aXN0aW5nIG5vZGVzIGluIG1haW4gZ3JhcGhcbiAgICAvLyAgICB2YXIgdHJlZUNoaWxkcmVuID0gW107XG4gICAgLy8gICAgZDMuc2VsZWN0QWxsKFwiI2dyYXBoIC5ub2RlXCIpLmVhY2goIGZ1bmN0aW9uKGQpIHsgXG4gICAgLy8gICAgICAgIGlmICh0aGlzTm9kZS5kYXR1bSgpLmNoaWxkSWRzLmluZGV4T2YoZC5tb3VzZUlkKSA+PSAwKSB7XG4gICAgLy8gICAgICAgICAgICB0cmVlQ2hpbGRyZW4ucHVzaChkKTtcbiAgICAvLyAgICAgICAgfVxuICAgIC8vICAgIH0gKTtcbiAgICAvLyAgICAvLyBEcmF3IGNoaWxkcmVuXG4gICAgLy8gICAgdmFyIHlwb3MgPSBDVi5pbmZvWXBvcyArIElWLmhlaWdodCAtIElWLmNoaWxkQmxvY2sgKyAzMDtcbiAgICAvLyAgICB2YXIgZHJhd25MaW5lYWdlID0gSVYuc3ZnQ2hpbGROb2Rlcy5zZWxlY3RBbGwoXCIubGluZWFnZU5vZGVcIilcbiAgICAvLyAgICAgICAgLy8uZGF0YSggdGhpc05vZGUuZGF0dW0oKS5jaGlsZElkcylcbiAgICAvLyAgICAgICAgLmRhdGEoIHRyZWVDaGlsZHJlbiwgZnVuY3Rpb24gKGQpIHtcbiAgICAvLyAgICAgICAgICAgIHJldHVybiBkLm1vdXNlSWQgPyBkLm1vdXNlSWQgOiBkLm5hbWU7IH0pO1xuICAgIC8vICAgIHZhciBjaGlsZFJhZGl1cyA9IDQuNTtcbiAgICAvLyAgICB2YXIgbm9kZXNQZXJMaW5lID0gTWF0aC5mbG9vciggKElWLndpZHRoIC0gKGNoaWxkUmFkaXVzKjYpKS8oY2hpbGRSYWRpdXMqNCkgKTtcbiAgICAvLyAgICB2YXIgbWF0Y2hNb3VzZTI7XG4gICAgLy8gICAgZHJhd25MaW5lYWdlLmVudGVyKCkuYXBwZW5kKFwiY2lyY2xlXCIpXG4gICAgLy8gICAgICAgIC5hdHRyKFwiclwiLCBjaGlsZFJhZGl1cylcbiAgICAvLyAgICAgICAgLmF0dHIoXCJjeFwiLCBmdW5jdGlvbihkLGkpIHsgXG4gICAgLy8gICAgICAgICAgICByZXR1cm4gMTAgKyAoaSAlIG5vZGVzUGVyTGluZSkgKiBjaGlsZFJhZGl1cyo0O1xuICAgIC8vICAgICAgICB9KVxuICAgIC8vICAgICAgICAuYXR0cihcImN5XCIsIGZ1bmN0aW9uKGQsaSkge1xuICAgIC8vICAgICAgICAgICAgcmV0dXJuIHlwb3MgKyBNYXRoLmZsb29yKGkvbm9kZXNQZXJMaW5lKSAqIDI1O1xuICAgIC8vICAgICAgICB9KVxuICAgIC8vICAgICAgICAuY2xhc3NlZChcImxpbmVhZ2VOb2RlXCIsIHRydWUpXG4gICAgLy8gICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBcInJnYigxNTAsMTUwLDE1MClcIilcbiAgICAvLyAgICAgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIFwiMS4wcHhcIilcbiAgICAvLyAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkKSB7XG4gICAgLy8gICAgICAgICAgICBpZihkLmdlbmRlciA9PSBcIkZcIikge1xuICAgIC8vICAgICAgICAgICAgICAgIHJldHVybiBcIiNGRjc1NzVcIjtcbiAgICAvLyAgICAgICAgICAgIH1cbiAgICAvLyAgICAgICAgICAgIGVsc2UgaWYgKGQuZ2VuZGVyID09IFwiTVwiKSB7XG4gICAgLy8gICAgICAgICAgICAgICAgcmV0dXJuIFwiIzMzNjZGRlwiO1xuICAgIC8vICAgICAgICAgICAgfVxuICAgIC8vICAgICAgICAgICAgZWxzZSByZXR1cm4gXCIjQzBDMEMwXCI7XG4gICAgLy8gICAgICAgIH0pXG4gICAgLy8gICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgICAgICAgIC8vdW5kbyBhbnkgcHJldmlvdXMgc2VsZWN0aW9uXG4gICAgLy8gICAgICAgICAgICBkMy5zZWxlY3QoXCIubGluZWFnZUhvdmVyZWRcIilcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJsaW5lYWdlSG92ZXJlZFwiLCBmYWxzZSlcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIFwicmdiKDE1MCwgMTUwLCAxNTApXCIpXG4gICAgLy8gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCBcIjEuMHB4XCIpO1xuICAgIC8vICAgICAgICAgICAgdmFyIGhvdmVyTm9kZSA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAvLyAgICAgICAgICAgIGhvdmVyTm9kZS5jbGFzc2VkKFwibGluZWFnZUhvdmVyZWRcIiwgdHJ1ZSlcbiAgICAvLyAgICAgICAgICAgICAgICAuc3R5bGUoIFwic3Ryb2tlXCIsIFwicmdiKDI1MCwyNTAsMClcIilcbiAgICAvLyAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgXCIzcHhcIik7XG4gICAgLy8gICAgICAgICAgICAvLyByZW1vdmVzIGFsbCB0b29sdGlwc1xuICAgIC8vICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiLmxpbmVhZ2VUb29sdGlwXCIpLnJlbW92ZSgpO1xuICAgIC8vICAgICAgICAgICAgYWRkX3Rvb2x0aXAoIGhvdmVyTm9kZSwgXCJsaW5lYWdlVG9vbHRpcFwiKTsgXG4gICAgLy8gICAgICAgICAgICAvL3RyaWdnZXIgaGlnaGxpZ2h0IGluIG1haW4gZ2VuIHZpZXdcbiAgICAvLyAgICAgICAgICAgIG1hdGNoTW91c2UyID0gZDMuc2VsZWN0QWxsKFwiI2dyYXBoIC5ub2RlXCIpLmZpbHRlciggZnVuY3Rpb24oZCkgeyBcbiAgICAvLyAgICAgICAgICAgICAgICByZXR1cm4gZC5tb3VzZUlkID09IGhvdmVyTm9kZS5kYXR1bSgpLm1vdXNlSWQ7IH0gKTtcbiAgICAvLyAgICAgICAgICAgIGhhbmRsZV9tb3VzZW92ZXIoIG1hdGNoTW91c2UyKTtcbiAgICAvLyAgICAgICAgICAgIH0pXG4gICAgLy8gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuICAgIC8vICAgICAgICAgICAgdmFyIHRoaXNOb2RlID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgIC8vICAgICAgICAgICAgaGFuZGxlX25vZGVfY2xpY2soIG1hdGNoTW91c2UyKTtcbiAgICAvLyAgICAgICAgfSlcbiAgICAvLyAgICBkcmF3bkxpbmVhZ2UuZXhpdCgpLnJlbW92ZSgpO1xuICAgIC8vfVxuXG4gICAgLy9GdW5jdGlvbiB0byBjcmVhdGUgZWxlbWVudHMgZm9yIHRoZSBwbG90LlxuICAgIHZhciBjcmVhdGVfaW5pdGlhbF92aWV3ID0gZnVuY3Rpb24gKCApIHtcblxuICAgICAgICAvL3ZhciBkaXZHcmFwaCA9IGQzLnNlbGVjdChcIiNncmFwaFwiKTtcbiAgICAgICAgdmFyIGRpdkdyYXBoID0gZDMuc2VsZWN0KGVsZW1lbnRbMF0pO1xuICAgICAgICBkaXZHcmFwaC5hdHRyKFwiaGVpZ2h0XCIsIHNjb3BlLkNWLmhlaWdodCArIDEwMClcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgc2NvcGUuQ1Yud2lkdGggKyBzY29wZS5DVi5pbmZvV2lkdGggKyAxNTApO1xuICAgICAgICBzY29wZS5DVi5zdmcgPSBkaXZHcmFwaC5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHNjb3BlLkNWLndpZHRoIClcbiAgICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBzY29wZS5DVi5oZWlnaHQpO1xuICAgIFxuICAgICAgICAvLyBBZGQgZXZlbnQgaGFuZGxlcnMgdG8gdmFyaW91cyB2aWV3IG9wdGlvbnNcbiAgICAgICAgLy9kMy5zZWxlY3QoXCIjc2VsZWN0Q29sb3JHcm91cFwiKS5vbihcImNoYW5nZVwiLCBoYW5kbGVfY29sb3IpO1xuICAgICAgICAvL2QzLnNlbGVjdChcIiNzZWxlY3RTaXplQnlcIikub24oXCJjaGFuZ2VcIiwgaGFuZGxlX3NpemUpO1xuICAgICAgICAvL2QzLnNlbGVjdChcIiNnZW5kZXJDaGVja1wiKS5vbihcImNsaWNrXCIsIGhhbmRsZV9ncm91cF9nZW5kZXIpO1xuICAgICAgICAvL2QzLnNlbGVjdChcIiNsaXR0ZXJDaGVja1wiKS5vbihcImNsaWNrXCIsIGhhbmRsZV9ncm91cF9saXR0ZXIpO1xuICAgICAgICAvLy8vZDMuc2VsZWN0KFwiI2dlbmVDaGVja1wiKS5vbihcImNsaWNrXCIsIGhhbmRsZV9ncm91cF9nZW5lKTtcbiAgICAgICAgLy9kMy5zZWxlY3QoXCIjYWRkR2Vub3R5cGVGaWx0ZXJcIikub24oXCJjbGlja1wiLCBoYW5kbGVfYWRkX2dlbm9fZmlsdGVyKTtcbiAgICAgICAgLy9kMy5zZWxlY3QoXCIjZG9uZUdlbm90eXBlRmlsdGVyXCIpLm9uKFwiY2xpY2tcIiwgaGFuZGxlX2RvbmVfZ2Vub19maWx0ZXIpO1xuICAgICAgICAvL2QzLnNlbGVjdChcIiNhbGxHZW5vXCIpLm9uKFwiY2xpY2tcIiwgaGFuZGxlX2FsbF9nZW5vX2ZpbHRlcik7XG4gICAgICAgIC8vZDMuc2VsZWN0QWxsKFwiI2dlbmVTZWxlY3RvciBpbnB1dFwiKS5vbihcImNsaWNrXCIsIGhhbmRsZV9nZW5lKTtcbiAgICAgICAgLy9kMy5zZWxlY3RBbGwoXCIjY29sb3JHZW5lU2VsZWN0b3IgaW5wdXRcIikub24oXCJjbGlja1wiLCBoYW5kbGVfZ2VuZV9jb2xvcik7XG4gICAgICAgIC8vZDMuc2VsZWN0QWxsKFwiI2dlbmRlckZpbHRlciBpbnB1dFwiKS5vbihcImNsaWNrXCIsIGhhbmRsZV9maWx0ZXJfZ2VuZGVyKTtcbiAgICAgICAgLy9kMy5zZWxlY3RBbGwoXCIjYWdlRmlsdGVyIGlucHV0XCIpLm9uKFwiY2xpY2tcIiwgaGFuZGxlX2ZpbHRlcl9hZ2UpO1xuICAgICAgICAvL2QzLnNlbGVjdChcIiNhZ2VTdGFydFwiKS5vbihcImNoYW5nZVwiLCBoYW5kbGVfZmlsdGVyX2FnZV9yYW5nZSk7XG4gICAgICAgIC8vZDMuc2VsZWN0KFwiI2FnZUVuZFwiKS5vbihcImNoYW5nZVwiLCBoYW5kbGVfZmlsdGVyX2FnZV9yYW5nZSk7XG4gICAgICAgIC8vZDMuc2VsZWN0KFwiI2FkZEdlbm90eXBlQ29sb3JcIikub24oXCJjbGlja1wiLCBoYW5kbGVfYWRkX2dlbm9fY29sb3IpO1xuICAgICAgICAvL2QzLnNlbGVjdChcIiNkb25lR2Vub3R5cGVDb2xvclwiKS5vbihcImNsaWNrXCIsIGhhbmRsZV9kb25lX2dlbm9fY29sb3IpO1xuICAgICAgICAvL2QzLnNlbGVjdChcIiNzdWJtaXRTZWFyY2hcIikub24oXCJjbGlja1wiLCBoYW5kbGVfc2VhcmNoKTtcbiAgICBcbiAgICAgICAgLy8gVXNlIGRlZmF1bHQgY29sb3Igc2VsZWN0aW9uIGluZGljYXRlZCBieSBET00gZHJvcGRvd24gZWxlbWVudFxuICAgICAgICAvL3ZhciBjb2xvck9wdGlvbiA9IGQzLnNlbGVjdChcIiNzZWxlY3RDb2xvckdyb3VwXCIpLm5vZGUoKTtcbiAgICAgICAgLy92YXIgY29sb3JCeSA9IGNvbG9yT3B0aW9uLm9wdGlvbnNbY29sb3JPcHRpb24uc2VsZWN0ZWRJbmRleF0udmFsdWU7XG4gICAgICAgIC8vaWYgKGNvbG9yQnkgPT0gXCJnZW5kZXJcIikgeyBzY29wZS5DVi5jb2xvcl9meG4gPSBhc3NpZ25fZ2VuZGVyX2NvbG9yOyB9XG4gICAgICAgIC8vZWxzZSBpZiAoY29sb3JCeSA9PSBcImdlbm90eXBlXCIpIHsgc2NvcGUuQ1YuY29sb3JfZnhuID0gYXNzaWduX2dlbm90eXBlX2NvbG9yO31cbiAgICAgICAgLy9lbHNlIHsgc2NvcGUuQ1YuY29sb3JfZnhuID0gYXNzaWduX2dlbmRlcl9jb2xvcjsgfVxuXG4gICAgICAgIHZhciBub2RlSGllcmFyY2h5ID0gcGxvdENvbmZpZy5mb3JtYXR0ZWREYXRhLmdldF9oaWVyYXJjaHkoKTtcbiAgICAgICAgdmFyIG5vZGVMYXlvdXRzID0gbGF5b3V0X2dlbmVyYXRpb25zKCBub2RlSGllcmFyY2h5KTtcbiAgICAgICAgc2V0X3NjYWxlX2ZvY2koIG5vZGVMYXlvdXRzKTtcbiAgICBcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgbm9kZUxheW91dHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBnZW5HcnAgPSBzY29wZS5DVi5zdmcuYXBwZW5kKFwiZ1wiKS5kYXR1bShpKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImlkXCIsXCJnXCIgKyBpKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIHBsb3RDb25maWcuZ2VuRm9jaVtpXS5keCArIFwiLCBcIiArIHBsb3RDb25maWcuZ2VuRm9jaVtpXS5keSArIFwiKVwiICk7XG4gICAgICAgICAgICBnZW5HcnAuc2VsZWN0QWxsKFwiLmdlblwiICsgaSkuZGF0YShub2RlTGF5b3V0c1tpXSlcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImN4XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueDsgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnk7IH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBwbG90Q29uZmlnLmZpdF9zY2FsZShkLnIpOyB9KVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5vZGVcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5tb3VzZUlkID8gdHJ1ZSA6IGZhbHNlOyB9KVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImdlblwiICsgaSwgXCJ0cnVlXCIpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBcInJnYigxNTAsMTUwLDE1MClcIilcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsIFwiMS4wcHhcIilcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZC5kZXB0aCA9PSAwKSB7IHJldHVybiBcInJnYmEoMjU1LDI1NSwyNTUsMClcIjsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBsb3RDb25maWcuY29sb3JfZnhuKGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGdlbkdycC5zZWxlY3RBbGwoXCIubm9kZVwiKVxuICAgICAgICAgICAgICAgICAgICAub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhpc05vZGUgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVfbW91c2VvdmVyKCB0aGlzTm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlb3V0XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXNOb2RlID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlX21vdXNlb3V0KCB0aGlzTm9kZSk7XG4gICAgICAgICAgICAvLyAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgIHZhciB0aGlzTm9kZSA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgaWYgKHRoaXNOb2RlLmRhdHVtKCkubW91c2VJZCkgeyAvL2lnbm9yZSBoaWVyYXJjaHkgY2lyY2xlc1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgaGFuZGxlX25vZGVfY2xpY2soIHRoaXNOb2RlKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgICAgIH0pXG4gICAgICAgICAgICAvLyAgICAgICAgLm9uKFwiZGJsY2xpY2tcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgIHZhciB0aGlzTm9kZSA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgaWYgKHRoaXNOb2RlLmRhdHVtKCkubW91c2VJZCkgeyAvL2lnbm9yZSBoaWVyYXJjaHkgY2lyY2xlc1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBzY29wZS5DVi5ocmVmX2luZGl2aWR1YWwoIHRoaXNOb2RlLmRhdHVtKCkubW91c2VJZCk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgc2NvcGUuQ1Yuc3ZnLnNlbGVjdEFsbChcImdcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgICAgICAgICAudGV4dCggZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJHZW5cIiArIGQ7fSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gcGxvdENvbmZpZy5nZW5Gb2NpW2RdLng7IH0pXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIHNjb3BlLkNWLmhlaWdodCAtIDI1KTtcbiAgICBcbiAgICB9O1xuXG5cbiAgICAvL0Z1bmN0aW9uIHRvIHJlLWRyYXcgdGhlIHBsb3QgYmFzZWQgb24gY2hhbmdlcyB0byBleGlzdGluZyBub2Rlc1xuICAgIC8vb3IgYWRkaW5nIG5vZGVzIG9yIGdyb3VwaW5nIHN0cnVjdHVyZS5cbiAgICB2YXIgdXBkYXRlX3ZpZXcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFxuICAgICAgICB2YXIgbm9kZUhpZXJhcmNoeSA9IHBsb3RDb25maWcuZm9ybWF0dGVkRGF0YS5nZXRfaGllcmFyY2h5KCk7XG5cbiAgICAgICAgdmFyIG5vZGVMYXlvdXRzID0gbGF5b3V0X2dlbmVyYXRpb25zKCBub2RlSGllcmFyY2h5KTtcblxuICAgICAgICBzZXRfc2NhbGVfZm9jaSggbm9kZUxheW91dHMpO1xuICAgICAgICAvLyBVcGRhdGUgdGhlIHRyYW5zbGF0aW9uIGZvciBlYWNoIGdlbmVyYXRpb24gYmFzZWQgb24gYW55IGNoYW5nZSBpbiBnZW5Gb2NpIGFuZCByYWRpaVxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBub2RlTGF5b3V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZDMuc2VsZWN0KFwiI2dcIiArIGkpLmF0dHIoXCJ0cmFuc2Zvcm1cIixcInRyYW5zbGF0ZShcIiArIHBsb3RDb25maWcuZ2VuRm9jaVtpXS5keCArIFwiLCBcIiArIHBsb3RDb25maWcuZ2VuRm9jaVtpXS5keSArIFwiKVwiICk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gR28gdGhyb3VnaCBlYWNoIGdlbmVyYXRpb24gaW4gbm9kZUxheW91dFxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBub2RlTGF5b3V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGdlblNlbGVjdCA9IGQzLnNlbGVjdChcIiNnXCIgKyBpKS5zZWxlY3RBbGwoXCIuZ2VuXCIgKyBpKVxuICAgICAgICAgICAgICAgIC5kYXRhKG5vZGVMYXlvdXRzW2ldLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkLm1vdXNlSWQgPyBkLm1vdXNlSWQgOiBkLm5hbWU7IH0pO1xuICAgICAgICAgICAgLy8gd2hlbiB0aGUgbGFzdCBnZW4gaXMgYmVpbmcgdXBkYXRlZCwgaW5kaWNhdGUgb2sgdG8gc2NoZWR1bGUgYXJyb3cgdXBkYXRlXG4gICAgICAgICAgICBpZiAoaSA9PSBub2RlTGF5b3V0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuQ1YuYXJyb3dSZWFkeSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBZGQgYW55IGlubmVyIGhpZXJhcmNoeSBjaXJjbGVzXG4gICAgICAgICAgICBnZW5TZWxlY3QuZW50ZXIoKVxuICAgICAgICAgICAgICAgIC5pbnNlcnQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImN4XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueDsgfSlcbiAgICAgICAgICAgICAgICAuYXR0cihcImN5XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueTsgfSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInJcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gcGxvdENvbmZpZy5maXRfc2NhbGUoZC5yKTsgfSlcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcIm5vZGVcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5tb3VzZUlkID8gdHJ1ZSA6IGZhbHNlOyB9KVxuICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwiZ2VuXCIgKyBpLCBcInRydWVcIilcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2VcIiwgXCJyZ2JhKDE1MCwxNTAsMTUwLDAuMSlcIilcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIiwgXCIxLjBweFwiKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5tb3VzZUlkID8gcGxvdENvbmZpZy5jb2xvcl9meG4oZCkgOiBcInJnYmEoMjU1LDI1NSwyNTUsMClcIjt9ICk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGhpZXJhcmNoeSBjaXJjbGVzIG5vdCBuZWVkZWRcbiAgICAgICAgICAgIGdlblNlbGVjdC5leGl0KClcbiAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpLmR1cmF0aW9uKDEyMDApLnN0eWxlKFwic3Ryb2tlXCIsIFwicmdiYSgxNTAsIDE1MCwgMTUwLCAuMlwiKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBub2Rlc1xuICAgICAgICAgICAgZ2VuU2VsZWN0LmVhY2goIGZ1bmN0aW9uKG5vZGVEYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRoaXNOb2RlID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciB0aGlzVHJhbiA9IHRoaXNOb2RlLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAuZGVsYXkoNzAwICogTWF0aC5wb3coaSwgMS41KSkuZHVyYXRpb24oMTQwMCAqIE1hdGgucG93KGksIDEuNSkpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIGQuY29sb3JHcm91cCAhPT0gJ3VuZGVmaW5lZCcgPyBkLmNvbG9yR3JvdXAgOiBcInJnYmEoMTUwLDE1MCwxNTAsMC45KVwiIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54OyB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImN5XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueTsgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHBsb3RDb25maWcuZml0X3NjYWxlKGQucik7IH0pO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS5DVi5hcnJvd1JlYWR5KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNUcmFuLnRyYW5zaXRpb24oKS5jYWxsKCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdmFyIGxpbmVzID0gZmluZF9lbmRwb2ludHMoIHNjb3BlLkNWLm5vZGVMYXlvdXQsIHNjb3BlLkNWLmdlbkZvY2kpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9kcmF3X2Fycm93cyggc2NvcGUuQ1Yuc3ZnLCBsaW5lcywgQVIubGluZV9nZW5lcmF0b3IpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBleGVjdXRlIG9uY2VcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuQ1YuYXJyb3dSZWFkeSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY29sb3JPcHRpb24gPSBkMy5zZWxlY3QoXCIjc2VsZWN0Q29sb3JHcm91cFwiKS5ub2RlKCk7XG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yQnkgPSBjb2xvck9wdGlvbi5vcHRpb25zW2NvbG9yT3B0aW9uLnNlbGVjdGVkSW5kZXhdLnZhbHVlO1xuICAgICAgICAgICAgICAgIHZhciBwaWVOb2RlID0gZDMuc2VsZWN0QWxsKFwiLnBpZS1cIiArIG5vZGVEYXRhLm1vdXNlSWQpO1xuICAgICAgICAgICAgICAgIGlmICggKGNvbG9yQnkgPT0gXCJjdXN0b21HZW5vdHlwZVwiKSAmJiAhcGllTm9kZS5lbXB0eSgpICkge1xuICAgICAgICAgICAgICAgICAgICBwaWVOb2RlLnRyYW5zaXRpb24oKS5kZWxheSg3MDAgKiBNYXRoLnBvdyhpLCAxLjUpKS5kdXJhdGlvbigxNDAwICogTWF0aC5wb3coaSwgMS41KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgbm9kZURhdGEueCArIFwiLFwiICsgbm9kZURhdGEueSArIFwiKVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLFwiMVwiKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIHVwZGF0ZSBoYXMgY2F1c2VkIHRoZSBzaXplIG9mIHRoZSBub2RlIHRvIGNoYW5nZVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpc05vZGUuYXR0cihcInJcIikgIT0gcGxvdENvbmZpZy5maXRfc2NhbGUobm9kZURhdGEucikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLkNWLmFyYy5vdXRlclJhZGl1cyggbm9kZURhdGEucik7XG4gICAgICAgICAgICAgICAgICAgICAgICBwaWVOb2RlLnNlbGVjdEFsbChcInBhdGhcIikuYXR0cihcImRcIiwgc2NvcGUuQ1YuYXJjKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGQzLnNlbGVjdEFsbChcIi5ub2RlXCIpXG4gICAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKCkge2hhbmRsZV9tb3VzZW92ZXIoIGQzLnNlbGVjdCh0aGlzKSk7IH0pXG4gICAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oKSB7aGFuZGxlX21vdXNlb3V0KCBkMy5zZWxlY3QodGhpcykpOyB9KTtcbiAgICAgICAgICAvLy5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCkgeyBoYW5kbGVfbm9kZV9jbGljayggZDMuc2VsZWN0KHRoaXMpKTsgfSk7XG4gICAgfTtcblxuXG4gICAgLy9TZWFyY2ggZm9yIGEgZ2l2ZW4gbW91c2UsIGFuZCBoaWdobGlnaHRcbiAgICB2YXIgc2VhcmNoX21vdXNlID0gZnVuY3Rpb24oIHNlYXJjaElkKSB7XG5cbiAgICAgICAgdmFyIGZvdW5kTW91c2UgPSBkMy5zZWxlY3RBbGwoXCIubm9kZVwiKS5maWx0ZXIoIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBkLm1vdXNlSWQgPT0gc2VhcmNoSWQ7IH0gKTtcbiAgICAgICAgaWYgKCFmb3VuZE1vdXNlLmVtcHR5KCkpIHtcbiAgICAgICAgICAgIGhhbmRsZV9tb3VzZW92ZXIoIGZvdW5kTW91c2UpO1xuICAgICAgICAgICAgZm91bmRNb3VzZS50cmFuc2l0aW9uKCkuZGVsYXkoMzAwKS5zdHlsZShcInN0cm9rZVwiLFwicmdiYSgyNTUsMjU1LDI1NSwwKVwiKVxuICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCkuZHVyYXRpb24oMTAwMCkuc3R5bGUoXCJzdHJva2VcIixcInJnYmEoMjUwLDIwMCwwLDEpXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlLXdpZHRoXCIsXCIxNHB4XCIpXG4gICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKS5kZWxheSgxMzAwKS5zdHlsZShcInN0cm9rZVwiLFwicmdiYSgyNTUsMjU1LDI1NSwwKVwiKVxuICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKCkuZGVsYXkoMTYwMCkuZHVyYXRpb24oMTAwMCkuc3R5bGUoXCJzdHJva2VcIixcInJnYmEoMjUwLDIwMCwwLDAuNylcIilcbiAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2Utd2lkdGhcIixcIjNweFwiKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLy9GaWx0ZXIgdGhlIGRhdGEgYnkgY2hlY2tpbmcgZm9yIGEgc2luZ2xlIHZhbHVlIGluIHRoZSBnaXZlbiBvYmplY3QgYXR0cmlidXRlIG5hbWUuXG4gICAgdmFyIGZpbHRlcl92YWx1ZSA9IGZ1bmN0aW9uKCBpZCwgYXR0ck5hbWUsIGF0dHJWYWwpIHtcbiAgICAgICAgLy9DbGVhciBhbnkgcHJldmlvdXMgZmlsdGVyIGZvciB0aGUgc2FtZSBpZC5cbiAgICAgICAgcGxvdENvbmZpZy5mb3JtYXR0ZWREYXRhLnJlbW92ZV9maWx0ZXIoIGlkKTtcbiAgICAgICAgcGxvdENvbmZpZy5mb3JtYXR0ZWREYXRhLmFkZF9maWx0ZXIoIGlkLCAgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW1bYXR0ck5hbWVdID09IGF0dHJWYWw7XG4gICAgICAgIH0pO1xuICAgICAgICB1cGRhdGVfdmlldygpO1xuICAgIH07XG5cblxuICAgIHZhciBhZ2VfdG9fZGF0ZSA9IGZ1bmN0aW9uKCBhZ2UpIHtcbiAgICAgICAgLy8gQ29udmVydCBhZ2UgdG8gYSBkYXRlXG4gICAgICAgIHZhciBtc0RheSA9IDI0ICogNjAgKiA2MCAqIDEwMDA7XG4gICAgICAgIC8vIENhbm5vdCBiZSBncmVhdGVyIHRoYW4gdGd0RGF0ZSB0byBtZWV0IG1pbiBhZ2VcbiAgICAgICAgdmFyIHRndERhdGUgPSBuZXcgRGF0ZSggRGF0ZS5ub3coKSAtIChhZ2UgKiBtc0RheSkpO1xuICAgICAgICB2YXIgdGd0WWVhciA9IFwiXCIgKyB0Z3REYXRlLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgIHZhciB0Z3RNb250aCA9IHRndERhdGUuZ2V0TW9udGgoKSArIDE7XG4gICAgICAgIHRndE1vbnRoID0gdGd0TW9udGggPiA5ID8gXCJcIiArIHRndE1vbnRoIDogXCIwXCIgKyB0Z3RNb250aDtcbiAgICAgICAgdmFyIHRndERheSA9IHRndERhdGUuZ2V0RGF0ZSgpO1xuICAgICAgICB0Z3REYXkgPSB0Z3REYXkgPiA5ID8gXCJcIiArIHRndERheSA6IFwiMFwiICsgdGd0RGF5O1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQodGd0WWVhciArIHRndE1vbnRoICsgdGd0RGF5KTtcbiAgICB9O1xuXG5cbiAgICAvL0ZpbHRlciB0aGUgbWljZSBkYXRhLlxuICAgIHZhciBmaWx0ZXJfaW50X3ZhbCA9IGZ1bmN0aW9uKCBjbXBfZnhuLCBpZCwgYXR0ck5hbWUsIHRndFZhbCApIHtcblxuICAgICAgICAvL0NsZWFyIGFueSBwcmV2aW91cyBmaWx0ZXIgZm9yIHRoZSBzYW1lIGlkLlxuICAgICAgICBwbG90Q29uZmlnLmZvcm1hdHRlZERhdGEucmVtb3ZlX2ZpbHRlciggaWQpO1xuICAgICAgICBwbG90Q29uZmlnLmZvcm1hdHRlZERhdGEuYWRkX2ZpbHRlciggaWQsICBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgaXRlbVZhbCA9IHBhcnNlSW50KGl0ZW1bYXR0ck5hbWVdKTtcbiAgICAgICAgICAgIGl0ZW1WYWwgPSBpc05hTiggaXRlbVZhbCkgPyAwIDogaXRlbVZhbDtcbiAgICAgICAgICAgIC8vIEluIGNhc2UgYSBsb3cgb3IgaGkgbGltaXQgdmFsdWUgaXMgbm90IHByb3ZpZGVkLCBkZWZhdWx0IHRvIHRydWVcbiAgICAgICAgICAgIGlmICghdGd0VmFsKSB7XG4gICAgICAgICAgICAgICByZXMgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICByZXMgPSBjbXBfZnhuKCBpdGVtVmFsLCB0Z3RWYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSk7XG4gICAgICAgIHVwZGF0ZV92aWV3KCk7XG4gICAgfTtcblxuICAgIC8vVGhlIFwiZG9iXCIgYXR0cmlidXRlIG9mIGFuIG9iamVjdCBmb3IgYSBtb3VzZSwgaXMgaW4gdGhlIGZvcm1hdCBcInl5eXltbWRkXCIgc28gaXQgY2FuIGJlIHRyZWF0ZWRcbiAgICAvL2FzIGFuIGludGVnZXIgZm9yIGNvbXBhcmluZyBpZiBhIGRhdGUgaXMgZWFybGllciBvciBsYXRlci5cbiAgICB2YXIgZmlsdGVyX21pbl9kYXRlID0gZmlsdGVyX2ludF92YWwuY3VycnkoIGZ1bmN0aW9uKCBhLCBiKSB7IHJldHVybiBhID49IGI7IH0gKTtcblxuICAgIHZhciBmaWx0ZXJfbWF4X2RhdGUgPSBmaWx0ZXJfaW50X3ZhbC5jdXJyeSggZnVuY3Rpb24oIGEsIGIpIHsgcmV0dXJuIGEgPD0gYjsgfSApO1xuXG4gICAgdmFyIGZpbHRlcl9taW5fYWdlID0gZnVuY3Rpb24oIGlkLCBhdHRyTmFtZSwgdGd0VmFsKSB7XG4gICAgICAgIHZhciB0Z3REYXRlID0gYWdlX3RvX2RhdGUoIHRndFZhbCk7XG4gICAgICAgIC8vIE1pY2UgYm9ybiBlYXJsaWVyIHRoYW4gdGd0RGF0ZSBhcmUgdGhlIGRlc2lyZWQgb2xkZXIgbWljZS5cbiAgICAgICAgZmlsdGVyX21heF9kYXRlKCBpZCwgYXR0ck5hbWUsIHRndERhdGUpO1xuICAgIH07XG5cbiAgICB2YXIgZmlsdGVyX21heF9hZ2UgPSBmdW5jdGlvbiggaWQsIGF0dHJOYW1lLCB0Z3RWYWwpIHtcbiAgICAgICAgdmFyIHRndERhdGUgPSBhZ2VfdG9fZGF0ZSggdGd0VmFsKTtcbiAgICAgICAgLy8gTWljZSBib3JuIGFmdGVyIHRndERhdGUgYXJlIHRoZSBkZXNpcmVkIHlvdW5nZXIgbWljZS5cbiAgICAgICAgZmlsdGVyX21pbl9kYXRlKCBpZCwgYXR0ck5hbWUsIHRndERhdGUpO1xuICAgIH07XG5cbiAgICB2YXIgcmVtb3ZlX2ZpbHRlciA9IGZ1bmN0aW9uKCBpZCkge1xuICAgICAgICBwbG90Q29uZmlnLmZvcm1hdHRlZERhdGEucmVtb3ZlX2ZpbHRlciggaWQpO1xuICAgICAgICB1cGRhdGVfdmlldygpO1xuICAgIH07XG5cblxuICAgIC8vLS0gUHJvdmlkZSBmdW5jdGlvbnMgdGhhdCBhcmUgdmlzaWJsZSB0byB0aGUgcGFyZW50IGRpcmVjdGl2ZSwgYW5kIHRocm91Z2ggdGhlXG4gICAgLy8gICBwYXJlbnQgYmVjb21lcyB2aXNpYmxlIHRvIG90aGVyIFwic2libGluZ1wiIGRpcmVjdGl2ZXMuXG5cblxuICAgIGN0bFswXS51cGRhdGVfdmlldyA9IHVwZGF0ZV92aWV3O1xuICAgIGN0bFswXS5mb3JtYXRfZ2VuZGVyID0gZm9ybWF0X2dlbmRlcjtcbiAgICBjdGxbMF0uc2VhcmNoX21vdXNlID0gc2VhcmNoX21vdXNlO1xuICAgIGN0bFswXS5maWx0ZXJfdmFsdWUgPSBmaWx0ZXJfdmFsdWU7XG4gICAgY3RsWzBdLmZpbHRlcl9taW5fZGF0ZSA9IGZpbHRlcl9taW5fZGF0ZTtcbiAgICBjdGxbMF0uZmlsdGVyX21heF9kYXRlID0gZmlsdGVyX21heF9kYXRlO1xuICAgIGN0bFswXS5maWx0ZXJfbWluX2FnZSA9IGZpbHRlcl9taW5fYWdlO1xuICAgIGN0bFswXS5maWx0ZXJfbWF4X2FnZSA9IGZpbHRlcl9tYXhfYWdlO1xuICAgIGN0bFswXS5yZW1vdmVfZmlsdGVyID0gcmVtb3ZlX2ZpbHRlcjtcbiAgICBjdGxbMF0uZm9ybWF0X2dlbmRlciA9IGZvcm1hdF9nZW5kZXI7XG4gICAgY3RsWzBdLnJlbW92ZV9mb3JtYXRfZ2VuZGVyID0gcmVtb3ZlX2Zvcm1hdF9nZW5kZXI7XG5cblxuICAgIC8vLS0gUnVuIGNyZWF0aW9uIG9mIHBsb3RcblxuICAgIHNjb3BlLmluaXRpYWxDb25maWcudGhlbiggXG4gICAgICAgIC8vIERyYXcgbm9kZXMgZm9yIGVhY2ggZ2VuZXJhdGlvbiBvZiBtaWNlLlxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIEVzdGltYXRlIGJvdW5kYXJ5IGNpcmNsZSBvZiBlYWNoIGdlbmVyYXRpb24gdG8gYXNzaWduIGxheW91dCBzaXplLlxuICAgICAgICAgICAgLy8gVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSB0aGUgZDMgY2lyY2xlIHBhY2tpbmcgZnVuY3Rpb24gbmVlZHMgYW4gb3ZlcmFsbCBzaXplLlxuICAgICAgICAgICAgLy8gVGhlIHggYW5kIHkgY29vcmRpbmF0ZXMgd2lsbCBiZSBmaWxsZWQgaW4gYWZ0ZXIgdGhlIGNpcmNsZSBwYWNraW5nIGlzIHJ1bi5cbiAgICAgICAgICAgIC8vIFRoaXMgaW5mbyBpcyBzYXZlZCBzbyB0aGF0IHdoZW4gdXNlciBzZWxlY3RzIGFjdGlvbnMgc3VjaCBhcyBmaWx0ZXJpbmcsXG4gICAgICAgICAgICAvLyB0aGVuIHRoZSBjaXJjbGVzIHJlcHJlc2VudGluZyBhIGdlbmVyYXRpb24gd2lsbCByZW1haW4gaW4gdGhlIHNhbWUgcGxhY2UuXG4gICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBzY29wZS5DVi5hbGxNaWNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGNpcmNsZSBzaXplIGJhc2VkIG9uIG51bWJlciBvZiBub2Rlc1xuICAgICAgICAgICAgICAgIHZhciB0b3RhbEFyZWEgPSA2NCogc2NvcGUuQ1YuYWxsTWljZVtpXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgcGxvdENvbmZpZy5nZW5Gb2NpW2ldID0ge1xuICAgICAgICAgICAgICAgICAgICBcInJhZGl1c1wiOiBNYXRoLnNxcnQodG90YWxBcmVhKSxcbiAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIFwieVwiOiAwIFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICAvL1RoZSBhbGxNaWNlIG9iamVjdCBpcyBhbiBhcnJheSBvZiBhcnJheXMgZm9yIGdlbmVyYXRpb24gZGF0YSwgYW5kIGVsZW1lbnQgYSBqc29uIG9iamVjdC5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWljZSBkYXRhIGZvcm1hdCBuZWVkcyB0byBzdXBwb3J0IGFkZGl0aW9uYWwgaGllcmFyY2h5IHN1Y2ggYXMgYnkgZ2VuZGVyIGFuZCBsaXR0ZXIuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYW4gb2JqZWN0IHRoYXQgc3RvcmVzIGZ4bnMgdGhhdCBuZWVkIHRvIGJlIGFwcGxpZWQgdG8gdGhlIG9yaWdpbmFsIHJhdyBkYXRhXG4gICAgICAgICAgICAvLyB0byBhY2hpZXZlIHRoZSBmaWx0ZXJpbmcgYW5kIGdyb3VwaW5nIHNwZWNpZmllZCBieSB1c2VyLlxuICAgICAgICAgICAgcGxvdENvbmZpZy5mb3JtYXR0ZWREYXRhID0geyBcbiAgICAgICAgICAgICAgICAvLyBmb3JtYXRfZnhucyBhcmUgZnVuY3Rpb25zIHRoYXQgdGFrZSBvbmUgcGFyYW1ldGVyIC0gYXJyYXkgb2YgcmF3IGRhdGEgb2JqZWN0c1xuICAgICAgICAgICAgICAgICdmaWx0ZXJlZEhpZXJhcmNoeSc6IG1pY2VfZGF0YV9mb3JtYXQoIHNjb3BlLkNWLmFsbE1pY2UpLFxuICAgICAgICAgICAgICAgIC8vIGZvcm1hdCBmeG5zIGFkZCBhbiBhZGRpdGlvbmFsIGxldmVsIG9mIGdyb3VwaW5nIHRvIGxlYWYgbm9kZXNcbiAgICAgICAgICAgICAgICAnZm9ybWF0X2Z4bnMnOiBbXSxcbiAgICAgICAgICAgICAgICAvLyBmaWx0ZXIgZnVuY3Rpb25zIHRha2Ugb25lIHBhcmFtZXRlciAtIGEgbm9kZSB0byB0ZXN0XG4gICAgICAgICAgICAgICAgJ2ZpbHRlcl9meG5zJzogW10sXG4gICAgICAgICAgICAgICAgLy8gcGVyZm9ybSB0aGUgZ3JvdXBpbmcgZnVuY3Rpb25zIGFuZCByZXR1cm4gZGF0YSBpbiBmb3JtYXQgZm9yIGNpcmNsZSBwYWNraW5nXG4gICAgICAgICAgICAgICAgJ2dldF9oaWVyYXJjaHknOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVjdXJzaXZlIGhlbHBlciBmeG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXBwbHlGb3JtYXQgPSBmdW5jdGlvbiggcGFyZW50TmFtZSwgY3VyckxldmVsLCBmb3JtYXRfaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbm5lckhpZXJhcmNoeSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgY2k9MDsgY2kgPCBjdXJyTGV2ZWwubGVuZ3RoOyBjaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZvcm1hdHRlZEdyb3VwID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIHRoZSBncm91cCBuYW1lIGlzIHVuaXF1ZSBmb3IgdGhlIGNpcmNsZXMgZGVub3RpbmcgYSBncm91cCwgYW5kIG5vdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhIG5vZGUsIGllLiBhIGZlbWFsZSBhbmQgbWFsZSBncm91cCB3aWxsIGJvdGggaGF2ZSBhIGdyb3VwIHJlcHJlc2VudGluZyBsaXR0ZXIgMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7J25hbWUnOiBwYXJlbnROYW1lICsgY3VyckxldmVsW2NpXS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbG9yR3JvdXAnOiB0eXBlb2YgY3VyckxldmVsW2NpXS5jb2xvckdyb3VwICE9PSAndW5kZWZpbmVkJyA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyTGV2ZWxbY2ldLmNvbG9yR3JvdXAgOiAncmdiYSgxNTAsMTUwLDE1MCwuOSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NoaWxkcmVuJzogdGhhdC5mb3JtYXRfZnhuc1tmb3JtYXRfaW5kZXhdKCBjdXJyTGV2ZWxbY2ldLmNoaWxkcmVuKSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEEgZGVwdGggZmlyc3QgYXBwcm9hY2ggaW4gcmVjdXJzaW9uLCBpbiB3aGljaCB0aGUgZm9ybWF0X2luZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZHMgdG8gZGVwdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIChmb3JtYXRfaW5kZXggKyAxKSA8IHRoYXQuZm9ybWF0X2Z4bnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE92ZXJ3cml0ZSBjaGlsZHJlbiBhcnJheSB3aXRoIGFkZGl0aW9uYWwgaGllcmFyY2h5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZEdyb3VwLmNoaWxkcmVuID0gYXBwbHlGb3JtYXQoIGZvcm1hdHRlZEdyb3VwLm5hbWUsIGZvcm1hdHRlZEdyb3VwLmNoaWxkcmVuLCBmb3JtYXRfaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1vZGlmeSB0aGUgbGVhZiAnbmFtZScgd2l0aCBhIHBhcmVudCBwcmVmaXhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKCB2YXIgaT0wOyBpIDwgZm9ybWF0dGVkR3JvdXAuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZEdyb3VwLmNoaWxkcmVuW2ldLm5hbWUgPSBjdXJyTGV2ZWxbY2ldLm5hbWUgKyBmb3JtYXR0ZWRHcm91cC5jaGlsZHJlbltpXS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlubmVySGllcmFyY2h5LnB1c2goIGZvcm1hdHRlZEdyb3VwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpbm5lckhpZXJhcmNoeTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiggdGhpcy5mb3JtYXRfZnhucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBhcHBseSBmb3JtYXRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcHBseUZvcm1hdCggJycsdGhpcy5maWx0ZXJlZEhpZXJhcmNoeSwgMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5maWx0ZXJlZEhpZXJhcmNoeTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gVGhlIGlkIHBhcmFtZXRlciBuZWVkcyB0byBjb3JyZWxhdGUgd2l0aCBET00gY2hlY2tib3ggdGhhdCB1c2VzIHRoZSAnZm10JyBmdW5jdGlvblxuICAgICAgICAgICAgICAgICdhZGRfZm9ybWF0JzogZnVuY3Rpb24oIGlkLCBmbXQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXR0YWNoIHRoZSBpZCBhcyBhbiBhdHRyaWJ1dGUgYmVsb25naW5nIHRvIHRoZSBmbXQgZnVuY3Rpb24gb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIGZtdC5pZCA9IGlkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdF9meG5zLnB1c2goIGZtdCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAncmVtb3ZlX2Zvcm1hdCc6IGZ1bmN0aW9uKCBpZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdF9meG5zID0gdGhpcy5mb3JtYXRfZnhucy5maWx0ZXIoIGZ1bmN0aW9uKCBlbGVtKSB7IHJldHVybiBlbGVtLmlkICE9IGlkOyB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICdhZGRfZmlsdGVyJzogZnVuY3Rpb24oIGlkLCBmaWx0ZXJGeG4pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXR0YWNoIHRoZSBpZCBhcyBhbiBhdHRyaWJ1dGUgYmVsb25naW5nIHRvIHRoZSBmbXQgZnVuY3Rpb24gb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgIGZpbHRlckZ4bi5pZCA9IGlkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbHRlcl9meG5zLnB1c2goIGZpbHRlckZ4bik7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcy5maWx0ZXJlZEhpZXJhcmNoeSA9IG1pY2VfZGF0YV9mb3JtYXQoIHNjb3BlLkNWLmFsbE1pY2UpO1xuICAgICAgICAgICAgICAgICAgICAvLyBBcHBseSBhZGRpdGlvbmFsIGZpbHRlclxuICAgICAgICAgICAgICAgICAgICAvLyBGaWx0ZXJzIGRlc2lnbmF0ZSB3aGF0ICpjYW4qIGJlIGRpc3BsYXllZC5cbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsdGVyIG1lbWJlcnMgb2YgZWFjaCBnZW5lcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGc9MDsgZyA8IHRoaXMuZmlsdGVyZWRIaWVyYXJjaHkubGVuZ3RoOyBnKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyZWRIaWVyYXJjaHlbZ10uY2hpbGRyZW4gPSB0aGlzLmZpbHRlcmVkSGllcmFyY2h5W2ddLmNoaWxkcmVuLmZpbHRlciggZmlsdGVyRnhuKTsgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICdyZW1vdmVfZmlsdGVyJzogZnVuY3Rpb24oIGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmlsdGVyX2Z4bnMgPSB0aGlzLmZpbHRlcl9meG5zLmZpbHRlciggZnVuY3Rpb24oIGVsZW0pIHsgcmV0dXJuIGVsZW0uaWQgIT0gaWQ7IH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbHRlcmVkSGllcmFyY2h5ID0gbWljZV9kYXRhX2Zvcm1hdCggc2NvcGUuQ1YuYWxsTWljZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLUFwcGx5IHJlbWFpbmluZyBmaWx0ZXJzXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGZpPTA7IGZpIDwgdGhpcy5maWx0ZXJfZnhucy5sZW5ndGg7IGZpKysgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgbWVtYmVycyBvZiBlYWNoIGdlbmVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGc9MDsgZyA8IHRoaXMuZmlsdGVyZWRIaWVyYXJjaHkubGVuZ3RoOyBnKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbHRlcmVkSGllcmFyY2h5W2ddLmNoaWxkcmVuID0gdGhpcy5maWx0ZXJlZEhpZXJhcmNoeVtnXS5jaGlsZHJlbi5maWx0ZXIodGhpcy5maWx0ZXJfZnhuc1tmaV0pOyBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNyZWF0ZV9pbml0aWFsX3ZpZXcoICk7IFxuICAgICAgICB9XG4gICAgLy8pLnRoZW4oXG4gICAgLy8gICAgLy8gR2l2ZSB0aGUgcGxvdCBhbiBpbml0aWFsIGdyb3VwaW5nIGJ5IGdlbmRlci5cbiAgICAvLyAgICBmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgICAgcGxvdENvbmZpZy5mb3JtYXR0ZWREYXRhLmFkZF9mb3JtYXQoIFwiZ2VuZGVyQ2hlY2tcIiwgY3JlYXRlX2dlbmRlcl9mb3JtYXQpO1xuICAgIC8vICAgICAgICB1cGRhdGVfdmlldygpOyBcbiAgICAvLyAgICB9XG4gICAgKTtcblxuICAgIC8vdmFyIGxpbmVzID0gZmluZF9lbmRwb2ludHMoIHNjb3BlLnNjb3BlLkNWLm5vZGVMYXlvdXQsIHNjb3BlLnNjb3BlLkNWLmdlbkZvY2kpO1xuICAgIC8vc2V0VGltZW91dCggZnVuY3Rpb24oKSB7IGRyYXdfYXJyb3dzKCBzY29wZS5zY29wZS5DVi5zdmcsIGxpbmVzLCBBUi5saW5lX2dlbmVyYXRvcik7fSwgNTAwMCk7XG5cbn1cblxuLy9EaXJlY3RpdmUgZm9yIGluaXRpYWwgcGxvdFxucGxvdE1vZHVsZS5kaXJlY3RpdmUoJ2QzY29sb255JywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGluaXRPYmogPSB7XG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIHJlcXVpcmU6IFsnXnBsb3RQYXJlbnQnXSxcbiAgICAgICAgbGluazogY2hpbGRfcGxvdF9saW5rXG4gICAgfTtcbiAgICByZXR1cm4gaW5pdE9iajtcbn0pO1xuIiwiLy9GaWxlOiBjb2xvbnktY29udHJvbGxlci5qc1xuLy9QdXJwb3NlOiBcblxuXG5wbG90TW9kdWxlLmZhY3RvcnkoJ2luaXREYXRhJywgWyckaHR0cCcsIGZ1bmN0aW9uKGh0dHApIHtcbiAgICAvL1JldHVybiBhIHByb21pc2UgZm9yIHRoZSBkYXRhLlxuICAgIHJldHVybiBodHRwLmdldCgnL21pY2UudHh0Jyk7XG59XSk7XG5cbi8vSW5pdGlhbGl6ZSB0aGUgc3ZnIGFyZWEgZGlzcGxheWluZyBkMyB2aXN1YWxpemF0aW9ucy5cbnBsb3RNb2R1bGUuY29udHJvbGxlcihcImNvbG9ueVBsb3RDb250cm9sbGVyXCIsIFsnJHNjb3BlJywgJ2luaXREYXRhJywgZnVuY3Rpb24oc2NvcGUsIGluaXREYXRhKSB7XG5cbiAgICAvLy0tIEhlbHBlciBmdW5jdGlvbnMgYW5kIGluaXRpYWwgdmFsdWVzIHRvIGNvbmZpZ3VyZSB0aGUgcGxvdCBzdWNoIGFzIGRpbWVuc2lvbnMgYW5kIHV0aWxpdGllcy5cblxuICAgIC8vIENvbnRhaW5lcnMgZm9yIGdsb2JhbCBkYXRhIHRvIGJlIHJlZmVyZW5jZWQgZXhwbGljaXRseS5cbiAgICBzY29wZS5DViA9IHt9OyAvL2RhdGEgZm9yIGdlbmVyYWwgY29sb255IHZpZXdcbiAgICBzY29wZS5JViA9IHt9OyAvL2RhdGEgcmVsYXRlZCB0byBsaW5lYWdlIHRyZWVcblxuICAgIC8vIEFsbG93IGZ1bmN0aW9uIGN1cnJ5aW5nIC0gY29waWVkIGZyb20gXCJKYXZhc2NyaXB0OiBUaGUgR29vZCBQYXJ0c1wiIGJ5IENyb2NrZm9yZFxuICAgIEZ1bmN0aW9uLnByb3RvdHlwZS5jdXJyeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UsXG4gICAgICAgICAgICAgICAgYXJncyA9IHNsaWNlLmFwcGx5KGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgdGhhdCA9IHRoaXM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KHNsaWNlLmFwcGx5KGFyZ3VtZW50cykpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIFxuICAgIC8vIEdlbmVyYWwgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGlmIGFuIG9iamVjdCBpcyBlbXB0eVxuICAgIGZ1bmN0aW9uIGlzX2VtcHR5KCBvYmopIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBcbiAgICBcbiAgICAvLyBGdW5jdGlvbiB0byBkZWNsYXJlIGluaXRpYWwgdmFsdWVzIGZvciBkaW1lbnNpb25zIGFuZCBhbHNvIHNvbWVcbiAgICAvLyBkYXRhIHN0cnVjdHVyZXMgZm9yIHVzZSBieSB0aGUgY29sb255IHBsb3QuXG4gICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbiAoIG1pY2VEYXRhKSB7XG5cbiAgICAgICAgLy9UaGUgYWxsTWljZSBvYmplY3QgaXMgYW4gYXJyYXkgb2YgYXJyYXlzIGZvciBnZW5lcmF0aW9uIGRhdGEsIGFuZCBlbGVtZW50IGEganNvbiBvYmplY3QuXG4gICAgICAgIC8vc2NvcGUuQ1YuYWxsTWljZSA9IEpTT04ucGFyc2UoIG1pY2VEYXRhLnRyaW0oKSApO1xuICAgICAgICBzY29wZS5DVi5hbGxNaWNlID0gbWljZURhdGE7XG4gICAgXG4gICAgICAgIHNjb3BlLkNWLmFjdGl2ZV9nZW5vdHlwZV9maWx0ZXJzID0gW107XG4gICAgICAgIHNjb3BlLkNWLmRpc2FibGVkX2dlbm90eXBlX2ZpbHRlcnMgPSBbXTtcbiAgICBcbiAgICAgICAgc2NvcGUuQ1Yud2lkdGggPSA5NTAsXG4gICAgICAgIHNjb3BlLkNWLmhlaWdodCA9IDU2MDtcbiAgICAgICAgc2NvcGUuQ1YuaW5mb0hlaWdodCA9IDE1MDtcbiAgICAgICAgc2NvcGUuQ1YuaW5mb1dpZHRoID0gMzUwO1xuICAgICAgICBzY29wZS5DVi5pbmZvWHBvcyA9IDA7XG4gICAgICAgIHNjb3BlLkNWLmluZm9ZcG9zID0gMzA7XG4gICAgXG4gICAgICAgIHNjb3BlLkNWLmhyZWZfaW5kaXZpZHVhbCA9IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiaHR0cDovL1wiICsgY3VyckRvbWFpbiArIFwiL3Zpei9saW5lYWdlX3ZpZXcvP21vdXNlSWQ9XCIgKyB2YWw7XG4gICAgICAgIH07XG4gICAgXG4gICAgICAgIC8vIEluaXRpYWxpemF0aW9uIGZvciBsaW5lYWdlIHRyZWVcbiAgICAgICAgc2NvcGUuSVYud2lkdGggPSBzY29wZS5DVi5pbmZvV2lkdGg7XG4gICAgICAgIHNjb3BlLklWLmhlaWdodCA9IHNjb3BlLkNWLmhlaWdodCAtIHNjb3BlLkNWLmluZm9IZWlnaHQgLSBzY29wZS5DVi5pbmZvWXBvcyAtIDIwO1xuICAgICAgICBzY29wZS5JVi5jaGlsZEJsb2NrID0gc2NvcGUuSVYuaGVpZ2h0IC8gNDtcbiAgICAgICAgc2NvcGUuSVYudHJlZSA9IGQzLmxheW91dC50cmVlKClcbiAgICAgICAgICAgIC5zaXplKFtzY29wZS5JVi53aWR0aCAtIDIwLCBzY29wZS5JVi5oZWlnaHQgLSBzY29wZS5JVi5jaGlsZEJsb2NrIC0gNzBdKTtcbiAgICAgICAgXG4gICAgICAgIHNjb3BlLklWLmRpYWdvbmFsID0gZDMuc3ZnLmRpYWdvbmFsKClcbiAgICAgICAgLnByb2plY3Rpb24oZnVuY3Rpb24oZCkgeyByZXR1cm4gW2QueSwgZC54XTsgfSk7XG4gICAgXG4gICAgICAgIC8vc2NvcGUuQ1YuZ2VuRm9jaSA9IFtdO1xuICAgICAgICB2YXIgZXN0aW1hdGVGb2NpID0gW107XG4gICAgICAgIC8vIEVzdGltYXRlIGJvdW5kYXJ5IGNpcmNsZSBvZiBlYWNoIGdlbmVyYXRpb24gdG8gYXNzaWduIGxheW91dCBzaXplXG4gICAgfVxuXG4gICAgLy8tLSBSdW4gaW5pdGlhbGl6YXRpb25cbiAgICAvLyBpbml0aWFsTGF5b3V0IGlzIGEgcHJvbWlzZSBvYmpcbiAgICBzY29wZS5pbml0aWFsQ29uZmlnID0gaW5pdERhdGEudGhlbiggXG4gICAgICAgIGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgaW5pdGlhbGl6ZSggcmVzdWx0LmRhdGEpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiggZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoIGVycm9yKTtcbiAgICAgICAgfSk7XG5cbn1dKTtcbiIsIi8vRmlsZTogY29sb255LXBhcmVudC1kaXJlY3RpdmUuanNcbi8vUHVycG9zZTogXG5cblxudmFyIHBsb3RfcGFyZW50X2RpcmVjdGl2ZSA9IGZ1bmN0aW9uKCRzY29wZSkge1xufVxuXG5wbG90TW9kdWxlLmRpcmVjdGl2ZSgncGxvdFBhcmVudCcsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbml0T2JqID0ge1xuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgQ1Y6ICc9aW5pdENvbmZpZydcbiAgICAgICAgfSxcbiAgICAgICAgY29udHJvbGxlcjogcGxvdF9wYXJlbnRfZGlyZWN0aXZlXG4gICAgfTtcbiAgICByZXR1cm4gaW5pdE9iajtcbn0pO1xuXG4iLCJcbmNvbG9ueU9wdGlvbnNNb2R1bGUuY29udHJvbGxlcignZGF0ZUNvbnRyb2xsZXInLCBbJyRzY29wZScsIGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgc2NvcGUuZG9iU3RhcnQgPSBcIlwiO1xuICAgIHNjb3BlLmRvYkVuZCA9IFwiXCI7XG4gICAgc2NvcGUubWluTnVtID0gXCJcIjtcbiAgICBzY29wZS5tYXhOdW0gPSBcIlwiO1xufV0pO1xuXG5jb2xvbnlPcHRpb25zTW9kdWxlLmRpcmVjdGl2ZSgnY29sb255b3B0aW9ucycsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHJlcXVpcmU6IFsnXnBsb3RQYXJlbnQnXSxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2NvbG9ueS1vcHRpb25zLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgICAgIHNjb3BlLmFnZUZpbHRlciA9IFwiQWxsXCI7XG4gICAgICAgIH0sXG4gICAgICAgIHJlcGxhY2U6IHRydWVcbiAgICB9O1xufSk7XG5cbmNvbG9ueU9wdGlvbnNNb2R1bGUuZGlyZWN0aXZlKCdnZW5kZXJHcm91cCcsIFtmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICByZXF1aXJlOiBbJ15wbG90UGFyZW50J10sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RsKSB7XG4gICAgICAgICAgICBlbGVtZW50LmJpbmQoXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiggZWxlbWVudC5wcm9wKFwiY2hlY2tlZFwiKSApIHtcbiAgICAgICAgICAgICAgICAgICAgY3RsWzBdLmZvcm1hdF9nZW5kZXIoIFwiZ2VuZGVyQ2hlY2tcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjdGxbMF0ucmVtb3ZlX2Zvcm1hdF9nZW5kZXIoIFwiZ2VuZGVyQ2hlY2tcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufV0pO1xuXG5jb2xvbnlPcHRpb25zTW9kdWxlLmRpcmVjdGl2ZSgnc2VhcmNoQnRuJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIHJlcXVpcmU6IFsnXnBsb3RQYXJlbnQnXSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdGwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBzdWNjZXNzID0gY3RsWzBdLnNlYXJjaF9tb3VzZShzY29wZS5tb3VzZUlkKTtcbiAgICAgICAgICAgICAgICBpZiggIXN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuc2VhcmNoUmVzcG9uc2UgPSBcIlRoZSBtb3VzZSBpZCBcIiArIHNjb3BlLm1vdXNlSWQgKyBcIiBjb3VsZCBub3QgYmUgZm91bmQuXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS5zZWFyY2hSZXNwb25zZSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufV0pO1xuXG5jb2xvbnlPcHRpb25zTW9kdWxlLmRpcmVjdGl2ZSgnZ2VuZGVyRmlsdGVyJywgW2Z1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgIHJlcXVpcmU6IFsnXnBsb3RQYXJlbnQnXSxcbiAgICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdGwpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuYmluZChcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGlmKCBhdHRyc1tcInZhbHVlXCJdID09PSBcIkFsbFwiICkge1xuICAgICAgICAgICAgICAgICAgICBjdGxbMF0ucmVtb3ZlX2ZpbHRlciggXCJmaWx0ZXJHZW5kZXJcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjdGxbMF0uZmlsdGVyX3ZhbHVlKCBcImZpbHRlckdlbmRlclwiLCBhdHRyc1tcIm5hbWVcIl0sIGF0dHJzW1widmFsdWVcIl0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn1dKTtcblxuY29sb255T3B0aW9uc01vZHVsZS5kaXJlY3RpdmUoJ2ZpbHRlck1pbkRhdGUnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0EnLFxuICAgICAgICByZXF1aXJlOiBbJ15wbG90UGFyZW50J10sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgY3RsKSB7XG4gICAgICAgICAgICBlbGVtZW50LmJpbmQoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRhc2hlcyBmcm9tIHRoZSBkYXRlIHN0cmluZy5cbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWREYXRlID0gZWxlbWVudC52YWwoKS5yZXBsYWNlKC8tL2csIFwiXCIpO1xuICAgICAgICAgICAgICAgIGN0bFswXS5maWx0ZXJfbWluX2RhdGUoIFwiZmlsdGVyTWluVmFsXCIsIGF0dHJzW1wibmFtZWZpbHRlcmVkXCJdLCBzZWxlY3RlZERhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG5cbmNvbG9ueU9wdGlvbnNNb2R1bGUuZGlyZWN0aXZlKCdmaWx0ZXJNYXhEYXRlJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgcmVxdWlyZTogWydecGxvdFBhcmVudCddLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0bCkge1xuICAgICAgICAgICAgZWxlbWVudC5iaW5kKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkYXNoZXMgZnJvbSB0aGUgZGF0ZSBzdHJpbmcuXG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkRGF0ZSA9IGVsZW1lbnQudmFsKCkucmVwbGFjZSgvLS9nLCBcIlwiKTtcbiAgICAgICAgICAgICAgICBjdGxbMF0uZmlsdGVyX21heF9kYXRlKCBcImZpbHRlck1heFZhbFwiLCBhdHRyc1tcIm5hbWVmaWx0ZXJlZFwiXSwgc2VsZWN0ZWREYXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuXG5jb2xvbnlPcHRpb25zTW9kdWxlLmRpcmVjdGl2ZSgnZmlsdGVyTWluQWdlJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgcmVxdWlyZTogWydecGxvdFBhcmVudCddLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0bCkge1xuICAgICAgICAgICAgZWxlbWVudC5iaW5kKFwiaW5wdXRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkQWdlID0gcGFyc2VJbnQoIGVsZW1lbnQudmFsKCkpO1xuICAgICAgICAgICAgICAgIGlmICggc2VsZWN0ZWRBZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY3RsWzBdLmZpbHRlcl9taW5fYWdlKCBcImZpbHRlck1pblZhbFwiLCBhdHRyc1tcIm5hbWVmaWx0ZXJlZFwiXSwgc2VsZWN0ZWRBZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuXG5jb2xvbnlPcHRpb25zTW9kdWxlLmRpcmVjdGl2ZSgnZmlsdGVyTWF4QWdlJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBJyxcbiAgICAgICAgcmVxdWlyZTogWydecGxvdFBhcmVudCddLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIGN0bCkge1xuICAgICAgICAgICAgZWxlbWVudC5iaW5kKFwiaW5wdXRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkQWdlID0gcGFyc2VJbnQoIGVsZW1lbnQudmFsKCkpO1xuICAgICAgICAgICAgICAgIGlmICggc2VsZWN0ZWRBZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY3RsWzBdLmZpbHRlcl9tYXhfYWdlKCBcImZpbHRlck1heFZhbFwiLCBhdHRyc1tcIm5hbWVmaWx0ZXJlZFwiXSwgc2VsZWN0ZWRBZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn0pO1xuXG5jb2xvbnlPcHRpb25zTW9kdWxlLmRpcmVjdGl2ZSgnZGF0ZVBpY2tlcicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAvLyBFbmZvcmNlIHRoZSBhbmd1bGFySlMgZGVmYXVsdCBvZiByZXN0cmljdGluZyB0aGUgZGlyZWN0aXZlIHRvXG4gICAgICAvLyBhdHRyaWJ1dGVzIG9ubHlcbiAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAvLyBBbHdheXMgdXNlIGFsb25nIHdpdGggYW4gbmctbW9kZWxcbiAgICAgIHJlcXVpcmU6ICc/bmdNb2RlbCcsXG4gICAgICBzY29wZToge1xuICAgICAgICAvLyBUaGlzIG1ldGhvZCBuZWVkcyB0byBiZSBkZWZpbmVkIGFuZFxuICAgICAgICAvLyBwYXNzZWQgaW4gdG8gdGhlIGRpcmVjdGl2ZSBmcm9tIHRoZSB2aWV3IGNvbnRyb2xsZXJcbiAgICAgICAgLy9zZWxlY3Q6ICcmJyAgICAgICAgLy8gQmluZCB0aGUgc2VsZWN0IGZ1bmN0aW9uIHdlIHJlZmVyIHRvIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmlnaHQgc2NvcGVcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgICAgaWYgKCFuZ01vZGVsKSByZXR1cm47XG5cbiAgICAgICAgdmFyIG9wdGlvbnNPYmogPSB7fTtcblxuICAgICAgICBvcHRpb25zT2JqLmRhdGVGb3JtYXQgPSAneXktbW0tZGQnO1xuICAgICAgICB2YXIgdXBkYXRlTW9kZWwgPSBmdW5jdGlvbihkYXRlVHh0KSB7XG4gICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIENhbGwgdGhlIGludGVybmFsIEFuZ3VsYXJKUyBoZWxwZXIgdG9cbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgdHdvLXdheSBiaW5kaW5nXG4gICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoZGF0ZVR4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZWxlbWVudC50cmlnZ2VyKFwiY2hhbmdlXCIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIG9wdGlvbnNPYmoub25TZWxlY3QgPSBmdW5jdGlvbihkYXRlVHh0LCBwaWNrZXIpIHtcbiAgICAgICAgICB1cGRhdGVNb2RlbChkYXRlVHh0KTtcbiAgICAgICAgfTtcblxuICAgICAgICBuZ01vZGVsLiRyZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBVc2UgdGhlIEFuZ3VsYXJKUyBpbnRlcm5hbCAnYmluZGluZy1zcGVjaWZpYycgdmFyaWFibGVcbiAgICAgICAgICBlbGVtZW50LmRhdGVwaWNrZXIoJ3NldERhdGUnLCBuZ01vZGVsLiR2aWV3VmFsdWUgfHwgJycpO1xuICAgICAgICB9O1xuICAgICAgICBlbGVtZW50LmRhdGVwaWNrZXIob3B0aW9uc09iaik7XG5cbiAgICAgICAgLy8gQWRqdXN0IGJhY2tncm91bmQgY29sb3IgYW5kIG9wYWNpdHkgb2YgdGhlIGNhbGVuZGFyLlxuICAgICAgICAkKFwiI3VpLWRhdGVwaWNrZXItZGl2XCIpXG4gICAgICAgICAgICAuY3NzKFwiYmFja2dyb3VuZC1jb2xvclwiLCBcInJnYmEoMjUwLCAyNTAsIDI1MCwgMSlcIilcbiAgICAgICAgICAgIC5jbGljayggZnVuY3Rpb24oIGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9