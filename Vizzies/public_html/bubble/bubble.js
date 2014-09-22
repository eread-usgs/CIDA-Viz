
// Various accessors that specify the four dimensions of data to visualize.
function x(d) { return d.elevation; }
function y(d) { return d.volume; }
function radius(d) { return d.maxVolume; }
function color(d) { return d.region; }
function key(d) { return d.name; }

// Chart dimensions.
var margin = {top: 50, right: 50, bottom: 50, left: 100},
    smallestMargin = Object.values(margin).min();
    width = 960 - margin.right - margin.left,
    height = 500 - margin.top - margin.bottom,
    //scale computed later dynamically based on available width
    xScale = undefined,
    radiusScale = undefined,
    //this is entirely fixed
    yScale = yScale = d3.scale.linear().domain([0, 100]).range([height, 0]);
  
  var dateCounter = Date.create("January 1, 2000");
  var dateDisplayFormat = '{yyyy}-{MM}-{dd}';
  var formatDateForDisplay = function(date){
      return date.format(dateDisplayFormat);
  };
var getMaxElevation = function(reservoirs){
  return getExtremeElevation('max', reservoirs);
};
var getMinElevation = function(reservoirs){
  return getExtremeElevation('min', reservoirs);
};

var getExtremeElevation = function(minOrMax, reservoirs){
  return getExtremeProperty(minOrMax, reservoirs, 'Elev');
};


var getMinCapacity = function(reservoirs){
  return getExtremeCapacity('min', reservoirs);
};

var getMaxCapacity = function(reservoirs){
  return getExtremeCapacity('max', reservoirs);
};

var getExtremeCapacity = function(minOrMax, reservoirs){
  return getExtremeProperty(minOrMax, reservoirs, 'Capacity');
};

/**
 * get either max or min
 * @param {String} minOrMax - one of 'min' or 'max'
 * @param {Array} reservoirs - an array of reservoir objects
 * @param {String} propertyName - name of property to examine
 */
var getExtremeProperty = function(minOrMax, reservoirs, propertyName){
  return reservoirs[minOrMax](function(reservoir){return reservoir[propertyName];})[propertyName];
};


var setXscale = function(dataMax, dataMin, displayMax){
  xScale = d3.scale.linear().domain([dataMin, dataMax]).range([0, displayMax]);
};

var setRadiusScale = function(dataMax, dataMin, displayMax){
  radiusScale = d3.scale.sqrt().domain([dataMin, dataMax]).range([5, displayMax]);
};


// Load the data.
d3.json("abbrev.reservoirs.json", function(reservoirs) {
//d3.json("../../../ca_reservoirs/storage_data/reservoir.json", function(reservoirs) {
    
    //perform multiple linear scans over reservoirs to determine dataset ranges
    //@todo: optimize to one-pass scan later if needed
    var maxElevation = getMaxElevation(reservoirs);
    var minElevation = getMinElevation(reservoirs);
    setXscale(maxElevation, minElevation, width);
    var minCapacity = getMinCapacity(reservoirs);
    var maxCapacity = getMaxCapacity(reservoirs);
    //bubbles should not be drawn off of the chart, therefore prevent radius from exceeding the smallest margin value 
    setRadiusScale(maxCapacity, minCapacity, smallestMargin);
    colorScale = d3.scale.category10();

// The x & y axes.
var xAxis = d3.svg.axis().orient("bottom").scale(xScale)/*.ticks(12, d3.format(",d"))*/,
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// Create the SVG container and set the origin.
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
     .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("elevation (m)");

// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("% capacity");

// Add the year label; the value is set on transition.
var label = svg.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", height - 24)
    .attr("x", width)
    .text(formatDateForDisplay(dateCounter));


  // A bisector since many nation's data is sparsely-defined.
  var bisect = d3.bisector(function(d) { return d[0]; });

  // Add an overlay for the year label.
  var box = label.node().getBBox();

   // Start a transition that interpolates the data based on year.
  // svg.transition()
  //     .duration(30000)
  //     .ease("linear")
  //     .tween("year", tweenYear)
  //     .each("end", enableInteraction);

  // Positions the dots based on data.
  function position(dot) {
    dot .attr("cx", function(d) { return xScale(x(d)); })
        .attr("cy", function(d) { return yScale(y(d)); })
        .attr("r", function(d) { return radiusScale(radius(d)); });
  }

  // Defines a sort order so that the smallest dots are drawn on top.
  function order(a, b) {
    return radius(b) - radius(a);
  }

  // Tweens the entire chart by first tweening the year, and then the data.
  // For the interpolated data, the dots and label are redrawn.
  function tweenYear() {
    var year = d3.interpolateNumber(2000, 2014);
    return function(t) { displayYear(year(t)); };
  }

  // Updates the display to show the specified year.
  function displayYear(date) {
    var interpolatedData = interpolateData(date);
 var dot = svg.append("g")
      .attr("class", "dots")
    .selectAll(".dot")
      .data(interpolateData(dateCounter));

    dot.enter().append("circle")
      .attr("class", "dot")
      .style("fill", function(d) { return colorScale(color(d)); })
      .call(position)
      .sort(order);
  dot.exit().remove();
  // Add a title.
  dot.append("title")
      .text(function(d) { return d.name; });
    dot.call(position);
    label.text(formatDateForDisplay(date));
  }

setInterval(function(){
  displayYear(dateCounter);
  // dateCounter = dateCounter.advance('1 day');
}, 100);
  // Interpolates the dataset for the given (fractional) year.
  var dateLookupFormat = '{yyyy}{MM}{dd}';
  function interpolateData(date) {
    var dateLookupKey = date.format(dateLookupFormat);
    var unfilteredReservoirs = reservoirs.map(function(d) {
      return {
        name: d["Station"],
        region: d["County"],
        elevation: d["Elev"],
        maxVolume: d["Capacity"],
        volume: d["Storage"][dateLookupKey]
      };
    });
    filteredReservoirs = unfilteredReservoirs.filter(function(d){
        return undefined !== d.volume;
    });
    return filteredReservoirs;
  }
});
