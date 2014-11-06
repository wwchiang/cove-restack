/* File: gender_stat.js
 * Purpose: provide functions to create a bar graph.
 */

// A container for global vars
SH = {};


// A formatter for counts.
//SH.formatCount = d3.format(",.0f");

// Default dimensions for graph
SH.margin = {top: 30, right: 20, bottom: 40, left: 20};
SH.width = 360 - SH.margin.left - SH.margin.right;
SH.height = 280 - SH.margin.top - SH.margin.bottom;

SH.yScale = d3.scale.linear();

//SH.data_layout = d3.layout.histogram();

SH.process_data = function( miceGenData) {
    // miceGenData is an array of generations, each being an array of mice objs. 
    // find the gender of each mouse and store id in array.
    var genderGroup = [ {'type':'male',
                         'members': []}, 
                        {'type':'female',
                         'members': []}, 
                        {'type':'unknown',
                         'members': []} ];
    for (var i=0; i < miceGenData.length; i++) {
       miceGenData[i].forEach( function(elem)
       {
           if (elem.gender === 'M') {
               genderGroup[0].members.push( elem.mouseId);
           }
           else if (elem.gender === 'F') {
               genderGroup[1].members.push( elem.mouseId);
           }
           else {
               genderGroup[2].members.push( elem.mouseId);
           }
       });
    }
    return genderGroup;
};

// Input: id of a dom element, and width and height of svg
function create_bars( parentId, miceGenData, width, height ) {

    width = width ? width : SH.width;
    height = height ? height : SH.height;
    var graphValues = SH.process_data( miceGenData);

    //Create drawing area. Transform moves positioning where margins end.
    var svg = d3.select( "#" + parentId).append("svg")
        .attr("width", width + SH.margin.left + SH.margin.right)
        .attr("height", height + SH.margin.top + SH.margin.bottom)
      .append("g")
        .attr("transform", "translate(" + SH.margin.left + "," + SH.margin.top + ")");
 
    //Get data in format for binding mouseIds to gender bars.
    var genderData = SH.process_data( miceGenData);
    //Calculate max height of a bar.
    var maxCount = 0;
    for (var i=0; i<genderData.length; i++) {
        if (genderData[i].members.length > maxCount) {
            maxCount = genderData[i].members.length;
        }
    }
    
    SH.yScale.domain([0, maxCount]).range([0, height]);
    var barWidth = width / (genderData.length * 2);
    var padding = barWidth/2;
 
    var bar = svg.selectAll(".bar")
        .data(genderData)
      .enter().append("g")
        .attr("class", "bar");
    
    bar.append("rect")
        .attr("x", function(d, i) { return i * barWidth + i * padding;})
        .attr("y", function(d, i) { return height - SH.yScale(d.members.length);})
        .attr("width", barWidth)
        .attr("height", function(d) { 
           return SH.yScale(d.members.length); })
        .style("fill", "#909090");
    
    bar.append("text")
        .attr("y", function(d) { 
            return height - SH.yScale(d.members.length) -15;})
        .attr("x", function(d, i) { 
            return i * barWidth + i * padding + barWidth/2;})
        .attr("text-anchor", "middle")
        .text(function(d) { return d.members.length > 0 ? d.members.length : ""; });
    
    bar.append("text")
        .attr("class", "bar-label")
        .attr("x", function(d, i) { return i * barWidth + i * padding;})
        .attr("y", height + 15)
        .attr("text-anchor", "start")
        .text(function(d) { return d.type;});

    ///bar.selectAll(".bar-label")
    ///   .attr("transform", function (d,i) {
    ///      var xpos = i * barWidth + i * padding;
    ///      var ypos = height;
    ///      return "rotate( 30 " + xpos + " " + ypos + ")"; });

 
}


