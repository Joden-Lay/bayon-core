'use strict';

// import namespaces
let utils = bayon.utils;
let app = bayon.app;
let fs = require('fs');
let debug = require('debug')('bayon:log');

function logHandler(obj, prop) {
    return function () {
        return obj(prop, utils._.toArray(arguments));
    };
}

function Log() {
    let message = '';
    let prefix = arguments[0];
    let args = utils._.toArray(arguments).slice(1);
    utils._.each(args, function (v) {
        message += v + '\n';
    });
    let output = utils.format('%s Date: %s \nMessage %s\n\n', prefix, Date(), message);
    debug(output);
    fs.appendFile(app.config.var, output);
}

let proxyLog = new Proxy(Log, {
    get: logHandler
});

module.exports = proxyLog;
