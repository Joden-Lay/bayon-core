'use strict';

// import namespaces
let utils = bayon.utils;
let components = bayon.components;
let httpRouter = bayon.httpRouter;
let controller = bayon.controller;
let filter = bayon.filter;
let assert = require('assert');
let debug = require('debug')('bayon:router');

//register route path with acually function
function registerHandler(routeItem, headler) {
    let method = routeItem.method.toLowerCase();
    debug(
        'Binding "%s" to path "%s" with method "%s"',
        routeItem.handler, routeItem.path, method.toUpperCase()
    );
    headler.actionHandler = true;
    components.app[method](routeItem.path, headler);
}

function solveController(routeItem) {
    let paths = routeItem.handler.split('@');
    if (paths.length < 2) {
        throw new Error('Invalid controller ' + routeItem.handler);
    }
    // first path is controller name
    let controllerName = paths['0'];
    // second path is action name
    let actionName = paths['1'];
    assert(
        controller[controllerName],
        'Cannot find controller with name ' + controllerName
    );
    assert(
        controller[controllerName][actionName],
        'Cannot find action ' + actionName + ' of controller ' + controllerName
    );
    // calling registerHandler by passing controler as key
    registerHandler(routeItem, controller[controllerName][actionName]);
}

function solveFilter(routeItem, handler) {
    let paths = handler.split('@');
    if (paths.length < 2) {
        throw new Error('Invalid filter ' + routeItem.handler);
    }
    // first path is filter name
    let filterName = paths['0'];
    // second path is action name
    let actionName = paths['1'];
    // calling registerHandler by passing controler as key
    assert(
        filter[filterName],
        'Cannot find filter with name ' + filterName
    );
    assert(
        filter[filterName][actionName],
        'Cannot find action ' + actionName + ' of filter ' + filterName
    );
    registerHandler(routeItem, filter[filterName][actionName]);
}

//determine route's type
function routeSolver(routeItem, handler, resolver) {
    switch (typeof handler) {
    case 'function':
        // solve as function handler
        registerHandler(routeItem, null, routeItem.handler);
        break;
    case 'string':
        // solve as controller - action handler
        resolver(routeItem, handler);
        break;
    default:
        throw new Error('unknow route type');
    }
}

function controllerResolver(routeItem) {
    routeSolver(routeItem, routeItem.handler, solveController);
}

function filterResolver(routeItem, direction) {
    if (Array.isArray(routeItem[direction])) {
        for (let ri in routeItem[direction]) {
            routeSolver(routeItem, routeItem[direction][ri], solveFilter);
        }
    } else {
        routeSolver(routeItem, routeItem[direction], solveFilter);
    }
}

function solveSingleRoute(routeItem) {
    if (routeItem.before) {
        filterResolver(routeItem, 'before');
    }
    controllerResolver(routeItem); //resolve the route handler
    if (routeItem.after) {
        filterResolver(routeItem, 'after');
    }
}

function getSingleRouteItem(routeGroup, routeItem) {
    let getFilter = function (direction) {
        let result = null;
        if (!routeItem[direction] || !Array.isArray(routeItem[direction])) {
            result = routeGroup[direction].slice(0);
            if (routeItem[direction]) {
                result.push(routeItem[direction]);
            }
        } else {
            result = routeGroup[direction].concat(routeItem[direction]);
        }
        return result;
    };
    routeItem.before = getFilter('before');
    routeItem.after = getFilter('after');
    routeItem.path = (routeGroup.prefix || '') + (routeItem.path || '');
    return routeItem;
}

function solveGroupRoute(routeGroup) {
    routeGroup.before = routeGroup.before || Array.isArray(routeGroup.before) ?
        routeGroup.before : (!routeGroup.before ? [] : [routeGroup.before]);
    routeGroup.after = routeGroup.after || Array.isArray(routeGroup.after) ?
        routeGroup.after : (!routeGroup.after ? [] : [routeGroup.after]);
    utils._.each(routeGroup.routes, function (route) {
        let routeItem = getSingleRouteItem(routeGroup, route);
        //build route item and pass it to single solveSingleRoute
        solveSingleRoute(routeItem);
    });
}


utils._.each(httpRouter, function (routeItem) {
    if (routeItem.routes) {
        // when property routes is provided solve it as route group
        solveGroupRoute(routeItem);
    } else {
        // solve as single route
        solveSingleRoute(routeItem);
    }
});
