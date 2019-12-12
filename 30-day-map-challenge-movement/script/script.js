const yellow = '#ffb400';
const meColour = '#192dff';
const youColour = '#00bd84';
var formatTime = d3.timeFormat("%B %d, %Y");


//plot
let width = document.getElementById('plot').clientWidth;
let height = document.getElementById('plot').clientHeight;
const scaleScale = d3.scaleLinear().domain([320, 600, 760, 980]).range([40, 60, 150, 400]).clamp(true);
let scale = 150;
checkScale();

function checkScale() {
    scale = scaleScale(width);
    if (width <= 600) {
        // scale = 60;
        maxSize = 10;
    }
}

console.log(scale);

// create canvas
var background = d3.select('#plot')
    .append('canvas')
    .attr("id","background")
    .node();

var plot = d3.select('#plot')
    .append('canvas')
    .attr("id","movements")
    .node();

background.width = 2 * width;
background.height = 2 * height;
plot.width = 2 * width;
plot.height = 2 * height;

const ctxBackground = background.getContext("2d");
const ctx = plot.getContext("2d");

//projection
const projection = d3.geoAugust()
    .scale(scale)
    .center([-30, 50])
    .translate([(width/2),(height/2)]);

// function to draw the map
const path = d3.geoPath()
    .projection(projection)
    .context(ctxBackground);

// function to draw the lines
var line = d3.line()
    .x(d => projection([d.longitudeE7 / 1e7, d.latitudeE7  / 1e7])[0])
    .y(d => projection([d.longitudeE7 / 1e7, d.latitudeE7  / 1e7])[1])
    .curve(d3.curveCatmullRom.alpha(0.5))
    .context(ctx);

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

        console.log(meDays);
    
    // prepare canvas
    ctxBackground.globalCompositeOperation = 'normal';
    ctxBackground.scale(2, 2);
    ctxBackground.fillStyle = '#dbefff';
    ctxBackground.globalAlpha = 1;
    ctxBackground.fillRect(0, 0, width, height);
    ctxBackground.lineJoin = "round";
    ctxBackground.lineCap = "round";

    // draw map
    ctxBackground.beginPath();
    path(topojson.feature(world, world.objects.land));
    ctxBackground.globalAlpha = 1;
    ctxBackground.fillStyle = "#fff";
    ctxBackground.fill();
    ctxBackground.closePath();

    ctx.globalCompositeOperation = 'normal';
    ctx.scale(2, 2);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, width, height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    
    const myFilter = filter();
    console.log(myFilter);
    ctx.canvas.style.filter = myFilter;
    console.log(filter);

    let t = 1000 * 60 * 60 * 7; // 7 hours
    const frame = 1000 * 60 * 60 * 8;
    let time = start + t * 10;
    const size = 8;
    let meStartPoint = [me[0].longitudeE7 / 1e7, me[0].latitudeE7  / 1e7];
    let youStartPoint = [you[0].longitudeE7 / 1e7, you[0].latitudeE7  / 1e7];

    let meInPos = meStartPoint;
    let youInPos = youStartPoint;
    draw();
    // drawAll();
    window.onresize = update;

    function draw() {

        const meDrawing = me.filter(d => +d.timestampMs >= time && +d.timestampMs < (time + t))
        const meLine = me.filter(d => +d.timestampMs >= (time - frame) && +d.timestampMs < (time + t));

        const youDrawing = you.filter(d => +d.timestampMs >= time && +d.timestampMs < (time + t))
        const youLine = you.filter(d => +d.timestampMs >= (time - frame) && +d.timestampMs < (time + t));

        const meRandomX = Math.random() * 5;
        const meRandomY = Math.random() * 5;

        const youRandomX = Math.random() * 5;
        const youRandomY = Math.random() * 5;

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
        
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'normal';
        ctx.scale(1, 1);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1;
        ctx.fillRect(0, 0, width, height);

        ctx.globalAlpha = 1;
        ctx.beginPath();
        line(meLine);
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = meColour;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.beginPath();
        line(youLine);
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = youColour;
        ctx.stroke();

        ctx.beginPath();
        // ctx.globalCompositeOperation = 'hard-light';
        ctx.fillStyle = meColour;
        ctx.globalAlpha = 0.9;
        ctx.arc(mePos[0] + meRandomX, mePos[1] + meRandomY, size, 0,  2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.closePath();

        ctx.beginPath();
        // ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = youColour;
        ctx.globalAlpha = 0.9;
        ctx.arc(youPos[0] - youRandomX, youPos[1] - youRandomY, size, 0,  2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.closePath();

        // if (time < end) {
        //     time = time + t;
        //     requestAnimationFrame(draw);
        // } else {
        //     drawAll();
        //     time = time;
        // }

    }

    function drawAll() {
            
        ctx.globalCompositeOperation = 'normal';
        ctx.scale(1, 1);
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < meDays.length; i++) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.beginPath();
            line(meDays[i].values);
            ctx.globalAlpha = 0.25;
            ctx.lineWidth = 1;
            ctx.strokeStyle = meColour;
            ctx.stroke();
            ctx.closePath();
        }

        for (let i = 0; i < youDays.length; i++) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.beginPath();
            line(youDays[i].values);
            ctx.globalAlpha = 0.25;
            ctx.lineWidth = 1;
            ctx.strokeStyle = youColour;
            ctx.stroke();
            ctx.closePath();
        }

        ctx.globalCompositeOperation = 'normal';
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

    // d3.select('#plot') 
    //     .select('svg')
    //     .attr('width', width + margin.r + margin.l)
    //     .attr('height', height + margin.t + margin.b);

    // projection
    //     .scale(scale)
    //     .translate([(width/2),(height/2)]);

    // path.projection(projection);

    // plotMap
    //     .select('path')
    //     .attr('d', path);
}

// from https://observablehq.com/@karimdouieb/gooey-effect-on-canvas
function filter () {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <defs>
        <filter id="goo">
            <feGaussianBlur in="SourceGraphic" color-interpolation-filters="sRGB" stdDeviation="5" result="blur"/>
            <feColorMatrix class="blurValues" in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo"/>
            <feBlend in="SourceGraphic" in2="blurResult" result="mix" />
        </filter>
      </defs>
    </svg>`
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    console.log(blob);
    const url = URL.createObjectURL(blob);
    //return url;
  
    const filter = `url('${url}#goo')`;
    return filter;
}
// 
{/* <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/> */}
        // <feComposite in="SourceGraphic" in2="goo" operator="atop" result="mix"/>