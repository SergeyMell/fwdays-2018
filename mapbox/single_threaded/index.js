'use strict';

/*global L */

var map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var markers = L.geoJson(null, {
    pointToLayer: createClusterIcon
}).addTo(map);

var ready = false;

function mainThreadCallback(e) {
    if (e.ready) {
        ready = true;
        update();
    } else if (e.expansionZoom) {
        map.flyTo(e.center, e.expansionZoom);
    } else {
        markers.clearLayers();
        markers.addData(e);
    }
};

function update() {
    if (!ready) {
        return;
    }
    var bounds = map.getBounds();
    workerCallback({
        bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom: map.getZoom()
    });
}

map.on('moveend', update);

function createClusterIcon(feature, latlng) {
    if (!feature.properties.cluster) {
        return L.marker(latlng);
    }

    var count = feature.properties.point_count;
    var size =
        count < 100 ? 'small' :
            count < 1000 ? 'medium' : 'large';
    var icon = L.divIcon({
        html: '<div><span>' + feature.properties.point_count_abbreviated + '</span></div>',
        className: 'marker-cluster marker-cluster-' + size,
        iconSize: L.point(40, 40)
    });

    return L.marker(latlng, {icon: icon});
}

markers.on('click', function (e) {
    if (e.layer.feature.properties.cluster_id) {
        workerCallback({
            getClusterExpansionZoom: e.layer.feature.properties.cluster_id,
            center: e.latlng
        });
    }
});

var now = Date.now();

var index;

function recalcPos(geojson) {
    geojson.features.forEach(function (feature) {
        feature.dx = feature.dx || Math.random();
        feature.dy = feature.dy || Math.random();
        if (!feature.geometry) {
            return;
        }
        if (Math.abs(feature.geometry.coordinates[0] + feature.dx) > 80) {
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

    index = supercluster({
        log: false,
        radius: 160,
        extent: 256,
        maxZoom: 37
    }).load(g.features);
    mainThreadCallback({ready: true});
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

        mainThreadCallback({ready: true});
    }, 1);
}

function stopCalc() {
    clearInterval(intervalId);
    intervalId = undefined;
}


function workerCallback(e) {
    if (e.getClusterExpansionZoom) {
        mainThreadCallback({
            expansionZoom: index.getClusterExpansionZoom(e.getClusterExpansionZoom),
            center: e.center
        });
    } else if (e) {
        mainThreadCallback(index.getClusters(e.bbox, e.zoom));
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

