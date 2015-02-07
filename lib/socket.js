'use strict';

// import namespaces
let utils = bayon.utils;
let components = bayon.components;
let socketRouter = bayon.socketRouter;
let controller = bayon.controller;
let co = require('co');
let io = require('socket.io')(components.server, utils.getConfig('socket'));
let endPoints = utils._.groupBy(socketRouter, 'namespace');
let debugSocket = require('debug')('bayon:socket');

/*
 * Convert the provided route handler to handler as
 * @param {Function} fn
 */
function getHandler(fn) {
    if (utils.isGeneratorFunction(fn)) {
        return function () {
            co(fn).call(this);
        };
    } else {
        return fn;
    }
}

function solveController(routeItem) {
    let paths = routeItem.handler.split('@');
    if (paths.length < 2) {
        throw new Error('Invalid controller ' + routeItem.handler);
    }
    let controllerName = paths['0']; // first path is controller name
    let actionName = paths['1']; // second path is action name
    return {
        controller: controller[controllerName],
        action: controller[controllerName][actionName]
    }; //return return solved controller
}

function controllerResolver(routeItem) {
    switch (typeof routeItem.handler) {
    case 'function':
        return {
            controller: null,
            action: routeItem.handler
        }; // solve as function handler
    case 'string':
        return solveController(routeItem, routeItem.handler); // solve as controller - action handler
    default:
        throw new Error('unknow route type');
    }
}

utils._.each(endPoints, function (endPoint, key) {
    io.of(key)
        .on('connection', function (socket) {
            debugSocket('Client %s connected at %s', socket.id, key);
            endPoint.forEach(function (routeItem) {
                let handler = controllerResolver(routeItem);
                getHandler(handler.action).call(socket);
            });
        });
});

module.exports = io;
