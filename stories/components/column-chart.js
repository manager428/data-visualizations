import hbs from 'htmlbars-inline-precompile';
import moment from 'moment';
import crossfilter from 'crossfilter';
import content from '../content/column-chart-data.json';
import { computed } from '@ember/object';

/**
 * Configure the rendered chart
 *
 * @param {array} dataSet set of objects
 * @example [
 *  { date: "20101101", value: 100 },
 *  { date: "20101201", value: 150 },
 *  { date: "20110101", value: 200 }
 * ]
 * @param {string} type either 'GROUPED' or 'STACKED'
 */
const buildConfigOptions = (dataset, options) => {
    dataset = JSON.parse(JSON.stringify(dataset));

    // combine dataset values together by date
    dataset.forEach(function (d) {
        d.date = moment(d.date, 'YYYYMMDD').toDate();
    });

    const dimension = crossfilter(dataset).dimension(d => d.date);

    // each datum key gets a bar on the bar chart
    // GROUPED = bars side by side, STACKED = bars on top of one another
    const type = options.type || 'GROUPED';

    const groupKeys = dataset.reduce((keys, datum) => {
        const datumKeys = Object.keys(datum).filter(key => key !== 'date');

        datumKeys.forEach(key => {
            if (!keys.includes(key)) {
                keys.push(key);
            }
        });

        return keys;
    }, []);

    const group = groupKeys.map(key => dimension.group().reduceSum(item => item[key] || 0));
    const series = groupKeys.map(key => ({ title: key, hatch: false }));
    const colors = ['#3F8BA8', '#2A2C4F', '#558D6C', '#F4880B'];

    const startX = dataset.map(d => d.date).reduce((start, time) => start && moment(start).isBefore(time) ? moment(start) : moment(time), null);
    const endX = dataset.map(d => d.date).reduce((end, time) => end && moment(end).isAfter(time) ? moment(end) : moment(time), null);

    const xAxis = {
        domain: [startX, endX],
        ticks: 3,
        tickMarks: 3
    };

    return Object.assign({
        type,
        height: 200,
        group,
        dimension,
        series,
        colors,
        showLegend: true,
        xAxis,
        yAxis: {
            ticks: 3
        }
    }, options);
};

const initialData = content;

export const columnChartConfigOptions = () => {
    return {
        template: hbs`
            <h1>Column Chart</h1>
            <button type="button" onclick={{action applyDataset nextDataset}}>Change dataset</button>
            <button type="button" onclick={{action toggleLegend}}>Toggle Showing Legend</button>
            <button type="button" onclick={{action reset}}>Reset</button>

            {{column-chart 
                dimension=config.dimension
                group=config.group
                type=config.type
                series=config.series
                colors=config.colors
                height=config.height
                showLegend=config.showLegend
                xAxis=config.xAxis
                yAxis=config.yAxis
            }}
        `,
        context: {
            dataset: initialData,
            nextDataset: initialData,
            overrides: { showLegend: true },

            config: computed('dataset', 'overrides.{showLegend}', function () {
                const dataset = this.get('dataset');
                const overrides = this.get('overrides');

                return buildConfigOptions(dataset, overrides);
            }),

            reset() {
                this.set('overrides', {});
            },

            applyDataset(dataset, overrides) {
                const currentDataset = this.get('dataset');

                if (overrides) {
                    this.set('overrides', overrides);
                }

                if (dataset !== currentDataset) {
                    this.set('nextDataset', currentDataset);
                }
            },

            toggleLegend() {
                const showLegend = this.get('overrides.showLegend');
                this.set('overrides.showLegend', !showLegend);
            }
        }
    };
};
