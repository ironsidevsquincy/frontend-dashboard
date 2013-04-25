require(['moment', 'bonzo', 'qwery', 'js!d3'], function(moment, bonzo, qwery) {

    var width = 940,
        height = 1000,
        color = d3.scale.category20(),
        margin = {
            top: 10,
            right: 300,
            bottom: 500,
            left: 50
        },
        chart,
        legend,
        currentType,
        count;

    init();
    update('message', 5);

    function init() {

        chart = d3.select('#chart')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

        legend = chart.append('g')
            .attr('id', 'key')
            .attr('transform', 'translate(' + (width - margin.right) + ', 0)');
    }

    function update(type, count) {
        currentType = type;
        currencCount = count;
        var config = createHistograms(type, count)
        updateStacks(d3.layout.stack()(config.histograms));
        addKey(config.uniqueTypes);
        addEvents();
    }

    function createHistograms(type, count) {
        var histogramRange = [null, null];
        // pull out types
        var types = {};
        errors.forEach(function(e) { 
            // create histogram range while here
            var time = moment(e.timestamp).valueOf();
            if (time < histogramRange[0] || histogramRange[0] === null) {
                histogramRange[0] = time;
            }
            if (time > histogramRange[1] || histogramRange[1] === null) {
                histogramRange[1] = time;
            }
            var prop = e[type];
            (types[prop]) ? types[prop]++ : types[prop] = 1;
        });

        var uniqueTypes = d3.keys(types);

        // order by top count
        uniqueTypes.sort(function(a, b) {
            return types[b] - types[a];
        });

        if (count) {
            uniqueTypes = uniqueTypes.slice(0, count)
        }

        var histograms = [];
        var histogramLayout = d3.layout.histogram()
            .bins(15)
            .range(histogramRange)
            .value(function(d) { return moment(d.timestamp).valueOf(); })
        // create histogram layouts
        uniqueTypes.forEach(function(b) {
            histograms.push(
                histogramLayout(errors.filter(function(d) { return d[type] === b; }))
            );
        });
        return {histograms : histograms, uniqueTypes: uniqueTypes};
    }

    function addEvents() {
        d3.selectAll('#controls input[name="show"]')
            .on('change', function(d, i) {
                update(this.value, currencCount);
            });
        d3.selectAll('#controls input[name="top-five"]')
            .on('change', function(d, i) {
                update(currentType, (this.checked) ? 5 : null);
            });
    }

    function updateStacks(stacks) {

        var x = d3.scale.ordinal()
            .domain(stacks[0].map(function(d) { return d.x; }))
            .rangeRoundBands([0, width - margin.left - margin.right], 0.3);

        var yStackMax = d3.max(stacks, function(stack) { return d3.max(stack, function(d) { return d.y0 + d.y; }); });

        var y = d3.scale.linear()
            .domain([0, yStackMax])
            .range([height - margin.top - margin.bottom, 0]);

        if (d3.select('.axis.x').empty()) {
            var xAxis = d3.svg.axis()
                .scale(x)
                .tickSize(5)
                .tickPadding(6)
                .orient('bottom')
                .tickFormat(function(d) { return moment(d).format('HH:mm'); });

            chart.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + (height - margin.top - margin.bottom) + ')')
                .call(xAxis);
        }

        // update y axis
        var yAxis = d3.svg.axis()
            .scale(y)
            .tickSize(5)
            .tickPadding(6)
            .orient('left');

        if (d3.select('.axis.y').empty()) {
            chart.append('g')
                .attr('class', 'y axis')
                .call(yAxis);
        } else {
            d3.select('.axis.y')
                .transition()
                .call(yAxis);
        }

        // UPDATE
        var layer = chart.selectAll('.layer')
            .data(stacks)

        // ENTER
        layer.enter()
            .append('g')
            .attr('class', 'layer')
            .style('fill', function(d, i) { return color(i); })
            .on('mouseover', function(d, i) {
                fadeOut(i);
            })
            .on('mouseout', function(d, i) {
                fadeIn(i);
            })
            .transition()
                .style('opacity', 1);

        // EXIT
        layer.exit()
            .remove();

        // UPDATE
        var rect = layer.selectAll('rect')
            .data(function(d) { return d; });

        rect.transition()
            .delay(function(d, i) { return i * 10; })
            .attr('y', function(d) { return y(d.y0 + d.y); })
            .attr('height', function(d) { return y(d.y0) - y(d.y0 + d.y); });

        // ENTER
        var rectEnter = rect.enter();

        rectEnter.append('rect')
            .attr('x', function(d) { return x(d.x); })
            .attr('y', function(d) { return y(d.y0 + d.y); })
            .attr('width', x.rangeBand())
            .attr('height', function(d) { return y(d.y0) - y(d.y0 + d.y); });

        // EXIT
        rect.exit()
            .remove();
    }

    function addKey(messages) {
        // UPDATE
        var key = legend.selectAll('.key')
            .data(messages);

        // ENTER
        var keyEnter = key.enter()
            .append('g')
            .classed('key', true)
            .attr('transform', function(d, i) { return 'translate(0, ' + (i * 20) + ')'; })
            .on('mouseover', function(d, i) {
                fadeOut(i)
            })
            .on('mouseout', function(d, i) {
                fadeIn(i);
            });

        keyEnter.transition()
            .style('opacity', 1);

        keyEnter.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .style('fill', function(d, i) { return color(i); });

        keyEnter.append('text')
            .text(function(d) { return d; })
            .attr('y', 10)
            .attr('x', 18);

        // UPDATE & ENTER
        key.select('text')
            .text(function(d) { return d; });

        // EXIT
        key.exit()
            .remove();

    }

    function fadeOut(i) {
        d3.selectAll('.layer').filter(function(e, j) { return i !== j; })
            .style('opacity', 0.1);
        d3.selectAll('.key').filter(function(e, j) { return i !== j; })
            .style('opacity', 0.1);
    }

    function fadeIn(i) {
        d3.selectAll('.layer')
            .style('opacity', 1);
        d3.selectAll('.key')
            .style('opacity', 1);
    }

});