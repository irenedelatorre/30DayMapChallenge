const yellow = '#ffb400';
const meColour = '#00A4CC';
const youColour = '#F95700';
var formatTime = d3.timeFormat("%B %d, %Y");
let animation = false;


//plot
let width = document.getElementById('plot').clientWidth;
let height = document.getElementById('plot').clientHeight;
const scaleScale = d3.scaleLinear().domain([320, 980]).range([180, 600]).clamp(true);
const scaleHeight = d3.scaleLinear().domain([568, 800]).range([20, 40]).clamp(true);
let center = [-30, 50];
let scale = 150;
checkScale();

function checkScale() {
    scale = scaleScale(width);
    center = [-30, scaleHeight(height)];
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

const plotSummary = plot
    .append('g')
    .attr('class', 'summary')
    // .style("filter", "url(#gooey-2)");

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
let projection = d3.geoAugust()
    .scale(scale)
    .center(center)
    .translate([(width/2),(height/2)]);

// function to draw the map
let path = d3.geoPath()
    .projection(projection);

// function to draw the lines
let line = d3.line()
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
    const her = files[1].locations.filter(d => new Date(+d.timestampMs) >= startDate && new Date(+d.timestampMs) <= endDate);
    const him = files[2].filter(d => new Date(+d.timestampMs) >= startDate && new Date(+d.timestampMs) <= endDate);

    const start = d3.min(her, d => +d.timestampMs);
    const end = d3.max(her, d => +d.timestampMs);

    const meDays = d3.nest()
        .key(d => {
            const date = new Date (+d.timestampMs);
            const roundDay = Math.floor(date.getDate() / 2) * 2;
            const month = date.getMonth();
            const year = date.getYear();

            return `${roundDay} ${month} ${year}`
        })
        .entries(her);

    const youDays = d3.nest()
        .key(d => {
            const date = new Date (+d.timestampMs);
            const roundDay = Math.floor(date.getDate() / 2) * 2;
            const month = date.getMonth();
            const year = date.getYear();

            return `${roundDay} ${month} ${year}`
        })
        .entries(him)

    // draw map
    plotMap
        .append('path')
        .datum(topojson.feature(world, world.objects.land))
        .attr('class', 'land')
        .attr('d', path);

    const speed = 1000 * 60 * 60 * 6; // 7 hours
    let t = speed;
    const frame = 1000 * 60 * 60 * 8;
    let time = start;
    const size = 8;
    let meStartPoint = [her[0].longitudeE7 / 1e7, her[0].latitudeE7  / 1e7];
    let youStartPoint = [him[0].longitudeE7 / 1e7, him[0].latitudeE7  / 1e7];

    const meRandomX = Math.random() * 5;
    const meRandomY = Math.random() * 5;
    const youRandomX = Math.random() * 5;
    const youRandomY = Math.random() * 5;

    let meInPos = meStartPoint;
    let youInPos = youStartPoint;
    
    d3.select('#timeFrame')
        .html(`From ${formatTime(start)} to ${formatTime(end)}`);

    drawAll();

    d3.select('#replay')
        .on('click', () => {
            animation = true;

            plotLines
                .selectAll('path')
                .remove();

            plotSummary.classed('hide', true);

            draw();

            d3.select('#replay')
                .attr('enabled', 'NO')
                .classed('inactive', true);

            d3.selectAll('.animationBTN')
                .attr('enabled', 'YES')
                .classed('inactive', false)
        });
    
    d3.select('#pause')
        .on('click', () => {
            animation = 'pause';

            d3.select('#pause')
                .attr('enabled', 'NO')
                .classed('inactive', true);

            d3.select('#replay')
                .attr('enabled', 'YES')
                .classed('inactive', false);
        });

    d3.select('#stop')
        .on('click', () => {
            animation = false;

            plotSummary.classed('hide', false);

            d3.selectAll('.animationBTN')
                .attr('enabled', 'NO')
                .classed('inactive', true)

            d3.select('#replay')
                .attr('enabled', 'YES')
                .classed('inactive', false);
        });

    window.onresize = update;

    function draw() {

        const meDrawing = her.filter(d => +d.timestampMs >= time && +d.timestampMs < (time + t))
        const meLine = her.filter(d => +d.timestampMs >= (time - frame) && +d.timestampMs < (time + t));

        const youDrawing = him.filter(d => +d.timestampMs >= time && +d.timestampMs < (time + t))
        const youLine = him.filter(d => +d.timestampMs >= (time - frame) && +d.timestampMs < (time + t));

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
                who: 'him', 
                position: youPos, 
                random: [youRandomX, youRandomY],
                color: youColour, 
                realPosition:youInPos
            }, {
                who: 'her',
                position: mePos, 
                random: [meRandomX, meRandomY],
                color: meColour, 
                realPosition: meInPos
            }
        ];

        const thisLines = [{
                who: 'him', 
                values: youLine,
                color: youColour
            }, {
                who: 'her',
                values: meLine,
                color: meColour
            }
        ];
        
        drawDots(thisDots);
        drawLines(thisLines);

        if (time < end && animation === true) {
            time = time + t;
            d3.select('#timeFrame')
                .html(formatTime(time));

            requestAnimationFrame(draw);
        } else if (time < end && animation === 'pause'){
            time = time;
        } else if (time > end || animation === false) {
            plotSummary.classed('hide', false);
            time = start;
            animation = false;

            d3.selectAll('.animationBTN')
                .attr('enabled', 'NO')
                .classed('inactive', true)

            d3.select('#replay')
                .attr('enabled', 'YES')
                .classed('inactive', false);

            d3.selectAll('.line')
                .remove();
    
            d3.selectAll('.dot')
                .remove();

            d3.select('#timeFrame')
                .html(`From ${formatTime(start)} to ${formatTime(end)}`);

            cancelAnimationFrame(draw);
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

        console.log(meDays);
        
        plotSummary
            .selectAll('.line-her')
            .data(meDays)
            .join('path')
            .attr('class', 'line-her')
            .attr('d', d => line(d.values))
            .style('stroke', meColour)
            .style('fill', 'none')
            .style('opacity', 0)
            .transition()
            .duration(500)
            .style('opacity', 0.25);

        plotSummary
            .selectAll('.line-him')
            .data(youDays)
            .join('path')
            .attr('class', 'line-him')
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
    width = document.getElementById('plot').clientWidth;
    height = document.getElementById('plot').clientHeight;

    checkScale();

    //projection
    projection = projection
        .center(center)
        .scale(scale)
        .translate([(width/2),(height/2)]);

    // function to draw the map
    path = path.projection(projection);

    // function to draw the lines
    line = line
        .x(d => projection([d.longitudeE7 / 1e7, d.latitudeE7  / 1e7])[0])
        .y(d => projection([d.longitudeE7 / 1e7, d.latitudeE7  / 1e7])[1]);
    
    d3.select('#plot')
        .selectAll('svg')
        .attr('width', width)
        .attr('height', height);

    plotMap
        .select('path')
        .attr('d', path);

    if (animation === 'pause') {
        // in movement should be automatic
        d3.selectAll('circle')
            .attr('cx', d => projection(d.realPosition)[0] + d.random[0])
            .attr('cy', d => projection(d.realPosition)[1] + d.random[1]);

    } else if (animation === false) {

        plotSummary
            .selectAll('.line-her')
            .attr('d', d => line(d.values));

        plotSummary
            .selectAll('.line-him')
            .attr('d', d => line(d.values));
    }

}