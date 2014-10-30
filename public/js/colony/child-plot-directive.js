//File: child-plot-directive.js
//Purpose:

var child_plot_link = function(scope, element, attrs, ctl) {

    var CV = scope.CV;

    //-- Helper functions

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

    //Function to create elements for the plot.
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

    scope.initialLayout.then( 
        function(result) {
            create_initial_view( result) 
        }
    );

    //CV.formattedData.add_format( "genderCheck", create_gender_format);
    //scope.CV.nodeLayout = nodeDrawing.layout_generations( scope.CV.formattedData.get_hierarchy() );
    //nodeDrawing.update_view( scope.CV.nodeLayout);
    //var lines = find_endpoints( scope.CV.nodeLayout, scope.CV.genFoci);
    //setTimeout( function() { draw_arrows( scope.CV.svg, lines, AR.line_generator);}, 5000);

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
