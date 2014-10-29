/**
 * Created by user on 11/15/13.
 * Thanks to referenced work:
 * https://www.dashingd3js.com/svg-paths-and-d3js
 * http://wimbledon.prcweb.co.uk/whoplayedwhom.html
 */


// Determine all parent-child paths
// Apply endpoint translations according to generation group
// Generate path details
// Append paths
// class each path with "parentOf[ ]" and "childOf[ ]" info

// Global variable container
AR = {};

AR.width = 950;
AR.height = 450;

AR.line_generator = d3.svg.line()
    .x( function(d) { return d.x;})
    .y( function(d) { return d.y;})
    .interpolate("basis");

// The src and tgt are objects with 'x' and 'y' attributes
function create_control_point( src, tgt) {
    var delta = {'x':(tgt.x - src.x)/2, 'y':(tgt.y - src.y)/2};
    var midpoint = {'x':src.x + delta.x, 'y':src.y + delta.y};
    // Translate the midpoint to a position perpendicular to line, by a distance that
    // is based on the length of the line, so that longer lines have greater arcs.
    var distance = Math.sqrt( Math.pow((midpoint.x-src.x), 2) + Math.pow((midpoint.y-src.y), 2) );
    // Convert slope to decimal
    delta.y = delta.y/delta.x;
    delta.x = 1;
    var perpendicularSlope = 1/(delta.y);
    var offset = distance / 8;
    var cpt = {'x':midpoint.x + offset, 'y':midpoint.y + (perpendicularSlope * offset)};
    if (cpt.y < 0) {
        cpt.y = 0;
    }
    else if ( cpt.y > AR.height) {
        cpt.y = AR.height;
    }
    return cpt;
}

// Parameters:
// nodeLayout is array of arrays, one for each generation, with elements having x and y values
// genFoci is an array of objects with position information for each generation - use for translation
function find_endpoints( nodeLayout, genFoci)  {
    // Create dictionary of mouse positions
    // May be able to pull this out for single execution if storing object references to nodes getting updated.
    var miceCoord = {};
    for (var i=0; i < nodeLayout.length; i++) {
        var gen = nodeLayout[i];
        for (var m=0; m < gen.length; m++) {
            if (gen[m].mouseId) {
                miceCoord[gen[m].mouseId] = {'x':gen[m].x + genFoci[i].dx, 'y':gen[m].y + genFoci[i].dy};
            }
        }
    }
    // Return an array with two-element arrays representing endpoints of lines
    var lines = [];
    for (var i=0; i < nodeLayout.length; i++) {
        var gen = nodeLayout[i];
        for (var m=0; m < gen.length; m++) {
            // For each mouseId, specify a line from father and another from mother
            // For each line, create a control point for curving the line, positioned relative to the midpoint
            if (gen[m].mouseId) {
                var currPt = {'x':miceCoord[gen[m].mouseId].x,
                    'y':miceCoord[gen[m].mouseId].y,
                    'id':gen[m].mouseId};
                if (miceCoord[gen[m].fatherId]) {
                    var srcPt =  {'x':miceCoord[gen[m].fatherId].x,
                        'y':miceCoord[gen[m].fatherId].y,
                        'id':gen[m].fatherId};
                    lines.push( [srcPt, create_control_point(srcPt, currPt), currPt]);
                }
                if (miceCoord[gen[m].motherId]) {
                    var srcPt =  {'x':miceCoord[gen[m].motherId].x,
                        'y':miceCoord[gen[m].motherId].y,
                        'id':gen[m].motherId};
                    lines.push( [srcPt, create_control_point(srcPt, currPt), currPt]);
                }
            }
        }
    }
    return lines;
}

// Create svg paths that are classed with mouseIds, from both endpoints.
// Parameters:
//  - svg is a d3 selection of object to append paths to
//  - lines is the result of function find_endpoints
function draw_arrows( svg, lines, line_fxn) {
    var pathSel = svg.selectAll("path").data(lines, function(d) {
            return d[0].id + d[2].id;
        });
    pathSel.enter()
        .append("path")
        .attr("d", function(d) { return line_fxn(d); })
        .attr("fill", "none")
        .classed("arrow",true)
        .style("stroke", "rgba(255,255,255,0)")
        .style("stroke-width", 1)
        .style("pointer-events", "none");
    pathSel.exit().remove();
    pathSel
        .attr("d", function(d) { return line_fxn(d); })
        .style("stroke", "rgba(255,255,255,0)");
}
