'use strict';

/*global importScripts supercluster */

importScripts('../dist/supercluster.js');

var now = Date.now();

var index;

function recalcPos(geojson) {
    geojson.features.forEach(function(feature) {
        feature.dx = feature.dx || 1 * Math.random();
        feature.dy = feature.dy || 1 * Math.random();
        if (!feature.geometry) {
            return;
        }
        if (Math.abs(feature.geometry.coordinates[0] + feature.dx) > 180) {
            feature.dx = -feature.dx;
        }
        if (Math.abs(feature.geometry.coordinates[1] + feature.dy) > 90) {
            feature.dy = -feature.dy;
        }

        feature.geometry.coordinates[0] += feature.dx;
        feature.geometry.coordinates[1] += feature.dy;
    });
}

var g, intervalId;

getJSON('../test/fixtures/earthquakes.geojson', function (geojson) {
    console.log('loaded ' + geojson.length + ' points JSON in ' + ((Date.now() - now) / 1000) + 's');
    g = geojson;
});

function startCalc() {
    if (typeof intervalId !== 'undefined') {
        return;
    }
    intervalId = setInterval(function() {
        recalcPos(g);
        index = supercluster({
            log: false,
            radius: 160,
            extent: 256,
            maxZoom: 37
        }).load(g.features);

        console.log(index.getTile(0, 0, 0));

        postMessage({ready: true});
    }, 1);
}

function stopCalc() {
    clearInterval(intervalId);
    intervalId = undefined;
}

self.onmessage = function (e) {
    if (e.data.getClusterExpansionZoom) {
        postMessage({
            expansionZoom: index.getClusterExpansionZoom(e.data.getClusterExpansionZoom),
            center: e.data.center
        });
    } else if (e.data === 'start_calc') {
        startCalc();
    } else if (e.data === 'stop_calc') {
        stopCalc();
    } else if (e.data) {
        postMessage(index.getClusters(e.data.bbox, e.data.zoom));
    }
};

function getJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onload = function () {
        if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300 && xhr.response) {
            callback(xhr.response);
        }
    };
    xhr.send();
}
