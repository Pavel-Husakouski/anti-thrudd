const fs = require('node:fs');
const thruddParser = require('./thrudd.js');
const analyseNetwork = require('./analyser.js');
const _ = require('lodash-node');

function main() {
    const text = readAll(process.argv[2]);
    const thrudd = thruddParser(text.replace(/((\r\n)|\t)+/g, ' '));

    if (thrudd == null || thrudd.rest !== '') {
        console.log('Format error\n' + JSON.stringify(thrudd && thrudd.rest, null, 2));
        process.exit(-1);
    }

    const data = thrudd.value;

    let loops = analyseNetwork(data).reduce(function (acc, route) {
        acc[route] = route;
        return acc;
    }, {});


    loops = _.chain(loops)
        .values()
        .sortBy(function (loop) {
            return loop.profit()
        })
        .value();

    loops = loops.slice(-100);

    let k = 0;
    for (const i in loops) {
        console.log('loop ' + (++k));
        if (!loops.hasOwnProperty(i))
            continue;

        const loop = loops[i];

        console.log('\t' + loop.caption());
        console.log('\t' + loop.profit());
    }

    if (loops.length === 0) {
        console.log('No loops were found');
    }

}

function readAll(path) {
    return fs.readFileSync(path, {encoding: 'binary', flag: 'r'});
}

main();
