/* File: gene_stat.js
 * Purpose: provide function to create a stacked graph
 */

// A container for global vars
SG = {};

// Default dimensions for graph
SG.margin = {top: 10, right: 40, bottom: 60, left: 40};
SG.width = 360 - SG.margin.left - SG.margin.right;
SG.height = 300 - SG.margin.top - SG.margin.bottom;
SG.barWidth = 30;

SG.x = d3.scale.linear();
SG.y = d3.scale.linear()
   .rangeRound( [SG.height, 0]);
SG.resultTypes = ["-/-", "-/+", "+/-", "+/+", "WT"];
SG.color_scale = d3.scale.category10()
   .domain( SG.resultTypes);
   
SG.yAxis = d3.svg.axis()
   .scale(SG.y)
   .orient("left");

// Create a data structure that groups as follows:
// [ { name: "gene1", 
//     geneValues: [
//               {
//                 genotype: "genotype1",
//                 members: [mouseIds...]
//               }
//               {
//                 genotype: "genotype2",
//                 members: [mouseIds...]
//               }
//             ]
//   },
//   { name: "gene2", ...
// ]
// ... where gene like "PTHrP" and genotype like "+/-"

// The structure is for making each gene name a separate column 
// and the column divided by genotype value
SG.process_data = function ( miceGenData) {
   var genes = [];
   var geneMap = {};
   var add_gene = function( geneName) {
      if (!geneName) { return;}
      var geneNum = genes.length;
      genes[geneNum] = {};
      genes[geneNum]["name"] = geneName;
      genes[geneNum]["geneValues"] = [];
      geneMap[geneName] = geneNum;
      geneNum += 1;
   };
   var add_genotype = function( geneName, genotypeName) {
      var valPos = genes[geneMap[geneName]].geneValues;
      valPos.push({});
      valPos[valPos.length - 1]["genotype"] = genotypeName;
      valPos[valPos.length - 1]["members"] = [];
   };
   var insert_value = function( geneName, genotype, id) {
      // push id into the genotype that this mouse has
      var gVals = genes[geneMap[geneName]].geneValues;
      for (var i=0; i < gVals.length; i++) {
         if ( gVals[i].genotype === genotype) {
            gVals[i].members.push(id);
            break;
         }
      }
   };

   for (var i=0; i < miceGenData.length; i++) {
      miceGenData[i].forEach( function(elem)
      {
         // Add new gene info
         if (genes.length < 3) {
            //if (typeof (genes.find( function(e) { return e.name === elem.gene1; })) === 'undefined') {
            var gene1Found = false;
            var gene2Found = false;
            var gene3Found = false;
            for (var j=0; j < genes.length; j++) {
               if (genes[j].name === elem.gene1) {
                  gene1Found = true;
               }
               if (genes[j].name === elem.gene2) {
                  gene2Found = true;
               }
               if (genes[j].name === elem.gene3) {
                  gene3Found = true;
               }
            }
            if (!gene1Found) {
               add_gene( elem.gene1);
               SG.resultTypes.forEach( function(r) { add_genotype( elem.gene1, r);});
            }
            if (!gene2Found) {
               add_gene( elem.gene2);
               SG.resultTypes.forEach( function(r) { add_genotype( elem.gene2, r);});
            }
            if (!gene3Found) {
               add_gene( elem.gene3);
               SG.resultTypes.forEach( function(r) { add_genotype( elem.gene3, r);});
            }
         }
         insert_value( elem.gene1, elem.genotype1, elem.mouseId);
         insert_value( elem.gene2, elem.genotype2, elem.mouseId);
         insert_value( elem.gene3, elem.genotype3, elem.mouseId);
      });
   }
   return genes;
}

function create_gene_stack( parentId, miceData) {

   var geneData = SG.process_data( miceData);
   // Calculate total number of mice in each gene category
   // Making a stacked bar requires saving position info based on sum of previous elements
   for (var i=0; i < geneData.length; i++) {
      geneData[i].total = geneData[i].geneValues.reduce( function(prev, curr, index, arr) { 
         arr[index].prevSum = prev; 
         return prev + curr["members"].length; }, 0);
   }

   // Obtain max height of a column to determine vertical scaling needed.
   var maxCount = d3.max(geneData, function(e) { return e.total; });
   SG.y.domain( [0, maxCount]);

   var svg = d3.select( "#" + parentId).append("svg")
       .attr("width", SG.width + SG.margin.left + SG.margin.right)
       .attr("height", SG.height + SG.margin.top + SG.margin.bottom)
       .append("g")
         .attr("transform", "translate(" + SG.margin.left + "," + SG.margin.top + ")");

   svg.append("g")
      .attr("class", "y axis")
      .call(SG.yAxis);
   
   var bar = svg.selectAll(".bar")
       .data(geneData)
       .enter().append("g")
          .attr("class", "bar")
          .attr("transform", function(d, i) { 
             var ypos = SG.y( d.total);
             return "translate(" + i*40 + "," + ypos + ")"; });
   
   bar.selectAll("rect").data( function(d) { 
      return d.geneValues; } ).enter()
      .append("rect")
          .attr("x", 1)
          // unlike the ypos offset used for translating whole column,
          // this prevSum should not be an inverted value.
          // (the SG.y function inverts domain and range)
          .attr("y", function(d) { return SG.height - SG.y(d.prevSum); })
          .attr("width", SG.barWidth)
          .attr("height", function(d) { 
             return SG.height - SG.y(d.members.length); })
          .style("fill", function(d) {
             return SG.color_scale( d.genotype);});

   bar.append("text")
       .attr("x", 1)
       .attr("y", function(d, i) {
          return SG.height - SG.y(d.total) + 10; })
       .attr("text-anchor", "start")
       .text(function(d) { return d.name;});

   bar.selectAll("text")
      .attr("transform", function (d,i) {
         var xpos = i*40;
         var ypos = SG.height;
         return "rotate( 30 " + xpos + " " + ypos + ")"; });

   var legend = svg.selectAll(".legend")
         .data(SG.color_scale.domain())
       .enter().append("g")
         .attr("class", "legend")
         .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
   
     legend.append("rect")
         .attr("x", SG.width - 18)
         .attr("width", 18)
         .attr("height", 18)
         .style("fill", SG.color_scale);
   
     legend.append("text")
         .attr("x", SG.width - 24)
         .attr("y", 9)
         .attr("dy", ".35em")
         .style("text-anchor", "end")
         .text(function(d) { return d; });   

}
