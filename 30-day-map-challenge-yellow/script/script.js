let maxSize = 20;
const paddingBox = 10;
const formatNumber = d3.format(',.2r');
const yellow = '#ffb400';
let drawing = 'Consulates';

//plot
const margin = {t: paddingBox,
    r: paddingBox,
    b: paddingBox,
    l: paddingBox};

let width = document.getElementById('plot').clientWidth - margin.r - margin.l;
let height = document.getElementById('plot').clientHeight - margin.t - margin.b;
const scaleScale = d3.scaleLinear().domain([600, 760, 980]).range([60, 150, 150])
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
    .attr('width', width + margin.r + margin.l)
    .attr('height', height + margin.t + margin.b);

//create groups to put the content inside them
const plotMap = plot
    .append('g')
    .attr('transform', `translate(${margin.l}, ${margin.t})`)
    .attr('class', 'background');

const plotGroupBubbles = plot
    .append('g')
    .attr('transform', `translate(${margin.l}, ${margin.t})`)
    .attr('class', 'tree node');

//projection
const projection = d3.geoBaker()
    .scale(scale)
    .translate([(width/2),(height/2)]);

// function to draw the map
const path = d3.geoPath()
    .projection(projection);


// load data
Promise.all([
    d3.json('data/world-110m.json'), // from https://bl.ocks.org/mbostock/raw/4090846/world-110m.json
    d3.csv('data/CERA_OCT_2019-xlsx.csv', parseData),
    d3.csv('data/pais_lon_lat-xlsx.csv', parseCountries),
])
  .then(function (files) {
    const world = files[0];
    const consulates = files[1];
    const countries = files[2];

    const extentTotal = d3.extent(consulates,function(d){return d.census});
    const scaleRadius = d3.scaleSqrt().domain(extentTotal).range([0,maxSize]);

    // lon and lats for consulates and countries
    reproject(consulates, scaleRadius);
    reproject(countries, scaleRadius);

    plotMap
        .append('path')
        .datum(topojson.feature(world, world.objects.land))
        .attr('class', 'land')
        .attr('d', path);

    draw(consulates);
    window.onresize = update;

    d3.select('#country').on('click', d => {
        drawing = 'Country';

        d3.select('#consulado')
            .classed('hidden', true);

        d3.select('#consulates')
            .classed('active', false);

        d3.select('#country')
            .classed('active', true);

        d3.select('.informacion').classed('hidden', true);

        draw(countries);
    });

    d3.select('#consulates').on('click', d => {
        drawing = 'Consulates';

        d3.select('#consulado')
            .html('')
            .classed('hidden', false);

        d3.select('#consulates')
            .classed('active', true);

        d3.select('#country')
            .classed('active', false);

        d3.select('.informacion').classed('hidden', true);

        draw(consulates);
    });

    
    function update(){
        width = document.getElementById('plot').clientWidth - margin.r - margin.l;
        height = document.getElementById('plot').clientHeight - margin.t - margin.b;

        checkScale();

        d3.select('#plot') 
            .select('svg')
            .attr('width', width + margin.r + margin.l)
            .attr('height', height + margin.t + margin.b);

        plotMap
            .select('path')
            .attr('d', path);

        projection
            .scale(scale)
            .translate([(width/2),(height/2)]);

        path.projection(projection);

        reproject(countries, scaleRadius);
        reproject(consulates, scaleRadius);

        if (drawing === 'Consulates') {
            draw(consulates);
        } else {
            draw(countries);
        }
    }

  })
  .catch(function(error){
      console.log(error);
       // handle error   
  });

function reproject(thisData, thisScale) {
    thisData.forEach(d => {
        d.x = projection(d.lon_lat)[0];
        d.y = projection(d.lon_lat)[1];
        d.r = thisScale(d.census);
    }) 
}

function draw(data) {
    const padding = 1.5; // separation between same-color nodes

    // group the center of the clusters in a different array
    const clusters = [];

    data.forEach((node) => {
        const clusterID = node.id_entry;

        if (!clusters[clusterID] || (node.r > clusters[clusterID].r)) {
            clusters[clusterID] = node;
        }
    });

    // create the force that will attract the points (to their geographical point)
    const forceCluster = d3.forceCluster()
        .centers(d => {
            const _thisCenter = clusters[d.id_entry];
            return [_thisCenter.x, _thisCenter.y];
            // return _thisCenter.country;
        })
        .strength(0.5);

    // keep entire simulation balanced around screen center
    const forceCenter = d3.forceCenter(width/2, height/2);

    //apply collision with padding
    const forceCollide = d3.forceCollide()
        .strength(1)
        .radius(d => d.r + padding)
        .iterations(1);

    //force layout
    //according to https://bl.ocks.org/ericsoco/4e1b7b628771ae77753842e6dabfcef3
    const simulation = d3.forceSimulation()
        .force('cluster', forceCluster)
        .alphaTarget(0.5)
        .on('tick', tick);

    let plotNode = plotGroupBubbles
        .selectAll('.bubble')
        .data(data, d => d.id_entry);

    reStart();

    function reStart() {

        // transition
        const t = d3.transition()
            .duration(500);

        //enter()
        plotNode
            .enter()
            .append('circle')
            .attr('class', 'bubble')
            .style('fill-opacity', 0)
            .style('fill', yellow)
            .attr('r', d => d.r)
            .on('mouseover', mouseOver)
            .on('click', mouseOver)
            .on('mouseout', mouseOut)
            .merge(plotNode)
            .transition(t)
            .style('fill-opacity', 0.7);

        //exit() remove previous bubbles
        plotNode
            .exit()
            .style('fill', '#eac468')
            .transition(t)
            .attrTween('r', d => {
                const i = d3.interpolate(0, d.r);
                return function(t) { return d.r = i(t); };
            })
            .attr('r',1e-6)
            .remove();

        // Update and restart the simulation.
        simulation
            .force('collide', forceCollide)
            .nodes(data)
            .alpha(1);
    }

    function tick() {
        plotGroupBubbles
            .selectAll('.bubble')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
    }
}

function mouseOver(d) {

    d3.selectAll('circle').classed('actived', false);
    d3.select(this).classed('actived', true);

    var xy = d3.mouse(document.getElementById('plot'));
    d3.select('#pais')
        .html(d.country);

    d3.select('#consulado')
        .html(d.consulate);

    d3.select('#censo')
        .html(formatNumber(d.census));

    d3.select('.informacion')
        .style('margin-left', `${d.x + 50}px`)
        .style('margin-top',`${d.y}px`);

    d3.select('.informacion').classed('hidden', false);
}

function mouseOut(d){
    d3.selectAll().classed('actived', false);
}

function parseData(d, i){
    return {
        id_entry: `consulate_${i}`,
        id_country: +d.id_pais,
        country: d.pais.toLowerCase(),
        id_consulate: +d.id_consula,
        consulate: d.consulado.toLowerCase(), 
        census: +d.censo_1_oc,
        lon_lat: [+d.lon, +d.lat],
        type_consulate: d.type
    }
}

function parseCountries(d, i){
    return {
        id_entry: `country_${i}`,
        id_country: +d.id_pais,
        country: d.pais.toLowerCase(),
        census: +d.censo,
        lon_lat: [+d.x, +d.y],
    }
}