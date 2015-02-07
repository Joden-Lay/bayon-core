'use strict';

let app = bayon.app;
let components = bayon.components;
let domain = require('domain');
let cluster = require('cluster');
let debug = require('debug')('bayon:worker');

module.exports = worker;

function responseAndSuicide(server, res) {
    server.close();
    cluster.worker.disconnect();
    res.statusCode = 500;
    res.setHeader('content-type', 'text/plain');
    res.end('Oops, there was a problem!\n');
}

function onError(server, res) {
    return function (er) {
        debug('Error sending 500!', er.stack);
        try {
            let killtimer = setTimeout(function () {
                process.exit(1);
            }, 30000);
            killtimer.unref();
            responseAndSuicide(server, res);
        } catch (er2) {
            debug('Error sending 500!', er2.stack);
        }
    };
}

function requestHandler(server) {
    return function (req, res) {
        let instance = domain.create();
        instance.on('error', onError(server, res));
        instance.add(req);
        instance.add(res);
        instance.run(function () {
            components.app(req, res);
        });
    };
}

function worker() {
    let server = require('http').createServer(requestHandler(server));
    components.server.listen(app.port);
}
