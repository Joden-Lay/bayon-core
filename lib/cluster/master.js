'use strict';
let cluster = require('cluster');
let debug = require('debug')('bayon:master');

module.exports = master;

function onOnline(worker) {
    debug('Worker #%s is now online!', worker.process.pid);
}

function onListening(worker) {
    debug('Worker #%s is ready!', worker.process.pid);
}

function onDisconnect(worker) {
    console.error('disconnect!');
    debug('Cluster %d died. restarting... ', worker.process.pid);
    cluster.fork(worker.process.env);
}

function bindEvents() {
    cluster.on('online', onOnline);
    cluster.on('listening', onListening);
    cluster.on('disconnect', onDisconnect);
}

function master(options) {
    let clusterCount = options.num;
    bindEvents();
    for (let i = 0; i < clusterCount; i++) {
        cluster.fork(process.env);
    }
}
