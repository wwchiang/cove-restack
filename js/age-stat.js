/* File: age_stat.js
 * Purpose: provide functions to create a distribution graph
 */

// A container for global vars
AH = {};


// A formatter for counts.
//AH.formatCount = d3.format(",.0f");

// Default dimensions for graph
AH.margin = {top: 10, right: 20, bottom: 40, left: 20};
AH.width = 360 - AH.margin.left - AH.margin.right;
AH.height = 260 - AH.margin.top - AH.margin.bottom;

AH.xScale = d3.scale.linear();
AH.yScale = d3.scale.linear();
AH.xScaleAxis = d3.svg.axis();

AH.data_layout = d3.layout.histogram();

AH.process_data = function( miceGenData) {
    // miceGenData is an array of generations, each being an array of mice objs. 
    // find the age of each mouse and put in 1D array
    var ages = [];
    var today = moment().startOf('day'); // don't include hours, etc
    for (var i=0; i < miceGenData.length; i++) {
       miceGenData[i].forEach( function(elem)
       {
          var elemAge = moment( elem.dob, 'YYYYMMDD');
          ages.push( today.diff( elemAge, 'days'));
       });
    }
    return ages;
};

// Input: id of a dom element, and width and height of svg
function create_histogram( parentId, miceGenData, width, height ) {

    width = width ? width : AH.width;
    height = height ? height : AH.height;
    var graphValues = AH.process_data( miceGenData);
    var posHeight = height + 20;
    AH.xScale
     .domain([0, Math.max.apply(null, graphValues)])
     .rangeRound([0, width]);
 
    // Generate a histogram using twenty uniformly-spaced bins.
    AH.data_layout.bins(AH.xScale.ticks(20));
    var dataLayout = AH.data_layout( graphValues);
    AH.yScale
     .domain([0, d3.max( dataLayout, function(d) { return d.y; })])
     .range([height, 0]);
 
    AH.xScaleAxis
     .scale(AH.xScale)
     .orient("bottom");
 
    var svg = d3.select( "#" + parentId).append("svg")
        .attr("width", width + AH.margin.left + AH.margin.right)
        .attr("height", posHeight + AH.margin.top + AH.margin.bottom)
      .append("g")
        .attr("transform", "translate(" + AH.margin.left + "," + AH.margin.top + ")");
 
    
    var bar = svg.selectAll(".bar")
        .data(dataLayout)
      .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { 
           var ypos = AH.yScale(d.y) + 20;
           //return "translate(" + AH.xScale(d.x) + "," + AH.yScale(d.y) + ")"; });
           return "translate(" + AH.xScale(d.x) + "," + ypos + ")"; });
    
    bar.append("rect")
        .attr("x", 1)
        .attr("width", AH.xScale(dataLayout[0].dx) - 1)
        .attr("height", function(d) { 
           return height - AH.yScale(d.y); })
        .style("fill", "#909090");
    
    bar.append("text")
        .attr("dy", ".75em")
        .attr("y", -15)
        .attr("x", AH.xScale(dataLayout[0].dx) / 2)
        .attr("text-anchor", "middle")
        .text(function(d) { return d.y > 0 ? d.y : ""; });
    
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + posHeight + ")")
        .call(AH.xScaleAxis);

    svg.append("text")
        .text("Days Old")
        .attr("y", posHeight + AH.margin.top + AH.margin.bottom - 15)
        .attr("x", width/2)
        .attr("text-anchor", "middle");
 
}


