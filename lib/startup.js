'use strict';

let cluster = require('cluster');
let clusterCount = bayon.app.config.clusters;
let numCpus = require('os').cpus().length;
clusterCount = clusterCount || numCpus;
// numCpus is the maximun of cluster amount
let forkCount = (numCpus > clusterCount) ? clusterCount : numCpus;


if (cluster.isMaster) {
    let masterFork = require('./cluster/master.js');
    masterFork({
        num: forkCount
    });
} else {
    let workerFork = require('./cluster/worker.js');
    workerFork();
}
