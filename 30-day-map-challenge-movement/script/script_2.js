const yellow = '#ffb400';
const meColour = '#00A4CC';
const youColour = '#F95700';
var formatTime = d3.timeFormat("%B %d, %Y");


//plot
let width = document.getElementById('plot').clientWidth;
let height = document.getElementById('plot').clientHeight;
const scaleScale = d3.scaleLinear().domain([320, 600, 760, 980]).range([40, 60, 150, 600]).clamp(true);
let scale = 150;
checkScale();

function checkScale() {
    scale = scaleScale(width);
    if (width <= 600) {
        // scale = 60;
        maxSize = 10;
    }
}

// Append svg to div
const plot = d3.select('#plot') 
    .append('svg')
    .attr('width', width)
    .attr('height', height);

//create groups to put the content inside them
const plotMap = plot
    .append('g')
    .attr('class', 'background');

const plotLines = plot
    .append('g')
    .attr('class', 'lines')
    // .style("filter", "url(#gooey-2)");

const plotDots = plot
    .append('g')
    .attr("id","movements")
    .style("filter", "url(#gooey)") //Set the filter on the container svg
    .attr('class', 'dots');

//SVG filter for the gooey effect
//Code taken from http://bl.ocks.org/sxywu/408b80e2e186c481b9ee99d86d116781
const defs = plot
    .append('defs');

const filter = defs
    .append('filter')
    .attr('id','gooey');

filter
    .append('feGaussianBlur')
    .attr('in','SourceGraphic')
    .attr('stdDeviation','4')
    .attr('result','blur');

filter
    .append('feColorMatrix')
    .attr('in','blur')
    .attr('mode','matrix')
    .attr('values','1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7');

const filterLines = defs
    .append('filter')
    .attr('id','gooey-2');

filterLines
    .append('feGaussianBlur')
    .attr('in','SourceGraphic')
    .attr('stdDeviation','2')
    .attr('result','blur');

filterLines
    .append('feColorMatrix')
    .attr('in','blur')
    .attr('mode','matrix')
    .attr('values','1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 200 -9');

//projection
const projection = d3.geoAugust()
    .scale(scale)
    .center([-30, 50])
    .translate([(width/2),(height/2)]);

// function to draw the map
const path = d3.geoPath()
    .projection(projection);

// function to draw the lines
var line = d3.line()
    .x(d => projection([d.longitudeE7 / 1e7, d.latitudeE7  / 1e7])[0])
    .y(d => projection([d.longitudeE7 / 1e7, d.latitudeE7  / 1e7])[1])
    .curve(d3.curveCatmullRom.alpha(0.5));

const requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

window.cancelRequestAnimFrame = ( function() {
    return window.cancelAnimationFrame          ||
        window.webkitCancelRequestAnimationFrame    ||
        window.mozCancelRequestAnimationFrame       ||
        window.oCancelRequestAnimationFrame     ||
        window.msCancelRequestAnimationFrame        ||
        clearTimeout
} )();


// load data
Promise.all([
    d3.json('data/world-110m.json'), // from https://bl.ocks.org/mbostock/raw/4090846/world-110m.json
    d3.json('data/me-location-history.json'),
    d3.json('data/you-location-history.json'),
])
  .then(function (files) {
    const startDate = new Date('1 May 2018');
    const endDate = new Date('9 Dec 2019');
    const world = files[0];
    const me = files[1].locations.filter(d => new Date(+d.timestampMs) >= startDate && new Date(+d.timestampMs) <= endDate);
    const you = files[2].filter(d => new Date(+d.timestampMs) >= startDate && new Date(+d.timestampMs) <= endDate);

    const start = d3.min(me, d => +d.timestampMs);
    const end = d3.max(me, d => +d.timestampMs);

    const meDays = d3.nest()
        .key(d => formatTime(+d.timestampMs))
        .entries(me);

    const youDays = d3.nest()
        .key(d => formatTime(+d.timestampMs))
        .entries(you)

    // draw map
    plotMap
        .append('path')
        .datum(topojson.feature(world, world.objects.land))
        .attr('class', 'land')
        .attr('d', path);

    let t = 1000 * 60 * 60 * 6; // 7 hours
    const frame = 1000 * 60 * 60 * 8;
    let time = start;
    const size = 8;
    let meStartPoint = [me[0].longitudeE7 / 1e7, me[0].latitudeE7  / 1e7];
    let youStartPoint = [you[0].longitudeE7 / 1e7, you[0].latitudeE7  / 1e7];

    const meRandomX = Math.random() * 5;
    const meRandomY = Math.random() * 5;
    const youRandomX = Math.random() * 5;
    const youRandomY = Math.random() * 5;

    let meInPos = meStartPoint;
    let youInPos = youStartPoint;
    let displaying = 'dots';
    // draw();
    drawAll();

    d3.select('#replay')
        .on('click', () => {
            time = start;
            displaying = 'dots';

            plotLines
                .selectAll('path')
                .remove();

            draw();

            d3.select('#replay')
                .attr('enabled', 'NO')
                .classed('inactive', true)
        });

    window.onresize = update;

    function draw() {

        const meDrawing = me.filter(d => +d.timestampMs >= time && +d.timestampMs < (time + t))
        const meLine = me.filter(d => +d.timestampMs >= (time - frame) && +d.timestampMs < (time + t));

        const youDrawing = you.filter(d => +d.timestampMs >= time && +d.timestampMs < (time + t))
        const youLine = you.filter(d => +d.timestampMs >= (time - frame) && +d.timestampMs < (time + t));

        mePos = projection(meInPos);
        youPos = projection(youInPos);

        if (meDrawing.length > 0 ){
            mePos = projection([meDrawing[meDrawing.length - 1].longitudeE7 / 1e7, meDrawing[meDrawing.length - 1].latitudeE7  / 1e7]);
            meInPos = [meDrawing[meDrawing.length - 1].longitudeE7 / 1e7, meDrawing[meDrawing.length - 1].latitudeE7  / 1e7];
        }


        if (youDrawing.length > 0) {
            youPos = projection([youDrawing[youDrawing.length - 1].longitudeE7 / 1e7, youDrawing[youDrawing.length - 1].latitudeE7  / 1e7]);
            youInPos = [youDrawing[youDrawing.length - 1].longitudeE7 / 1e7, youDrawing[youDrawing.length - 1].latitudeE7  / 1e7];
        }

        const thisDots = [{
                who: 'you', 
                position: youPos, 
                random: [youRandomX, youRandomY],
                color: youColour
            }, {
                who: 'me',
                position: mePos, 
                random: [meRandomX, meRandomY],
                color: meColour
            }
        ];

        const thisLines = [{
                who: 'you', 
                values: youLine,
                color: youColour
            }, {
                who: 'me',
                values: meLine,
                color: meColour
            }
        ];
        
        drawDots(thisDots);
        drawLines(thisLines);

        if (time < end) {
            time = time + t;
            requestAnimationFrame(draw);
        } else {
            drawAll();
            time = time;
            displaying = 'lines';
        }

    }

    function drawDots(data) {

        const plottingDots = plotDots
            .selectAll('.dot')
            .data(data, d => d.who)

        plottingDots
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('r', size)
            .attr('cx', d => d.position[0] + d.random[0])
            .attr('cy', d => d.position[1] + d.random[1])
            .style('fill', d => d.color)
            .style('stroke', 'none');

        plottingDots.exit().remove();

        plottingDots
            .attr('cx', d => d.position[0] + d.random[0])
            .attr('cy', d => d.position[1] + d.random[1]);
    }

    function drawLines(data) {

        window.cancelRequestAnimFrame(1);

        const plottingLines = plotLines
            .selectAll('.line')
            .data(data, d => d.who)

        plottingLines
            .enter()
            .append('path')
            .attr('class', 'line')
            .attr('d', d => line(d.values))
            .style('stroke', d => d.color)
            .style('fill', 'none');

        plottingLines.exit().remove();

        plottingLines
            .attr('d', d => line(d.values));
    }

    function drawAll() {

        plotLines
            .selectAll('.line')
            .exit()
            .transition()
            .duration(500)
            .style('opacity', 0)
            .remove();

        plotDots
            .selectAll('circle')
            .exit()
            .transition()
            .duration(500)
            .style('opacity', 0)
            .remove();

        plotLines
            .selectAll('.line-me')
            .data(meDays)
            .join('path')
            .attr('class', 'line-me')
            .attr('d', d => line(d.values))
            .style('stroke', meColour)
            .style('fill', 'none')
            .style('opacity', 0)
            .transition()
            .duration(500)
            .style('opacity', 0.25);

        plotLines
            .selectAll('.line-you')
            .data(youDays)
            .join('path')
            .attr('class', 'line-you')
            .attr('d', d => line(d.values))
            .style('stroke', youColour)
            .style('fill', 'none')
            .style('opacity', 0)
            .transition()
            .duration(500)
            .style('opacity', 0.25);
    }

  })
  .catch(function(error){
      console.log(error);
       // handle error   
  });



function update(){
    width = document.getElementById('plot').clientWidth - margin.r - margin.l;
    height = document.getElementById('plot').clientHeight - margin.t - margin.b;

    checkScale();

    //projection
    projection = projection.translate([(width/2),(height/2)]);

    // function to draw the map
    path = path.projection(projection);

    // function to draw the lines
    line = line
        .x(d => projection([d.longitudeE7 / 1e7, d.latitudeE7  / 1e7])[0])
        .y(d => projection([d.longitudeE7 / 1e7, d.latitudeE7  / 1e7])[1]);

    plot.select('svg')
        .attr('width', width)
        .attr('height', height);

    plotMap
        .select('path')
        .attr('d', path);

    if (displaying === 'dots') {
        // should be automatic
    } else {
        plotLines
            .selectAll('.line-me')
            .attr('d', d => line(d.values));

        plotLines
            .selectAll('.line-you')
            .attr('d', d => line(d.values));
    }

        // if one do... 
        // if two do...
}