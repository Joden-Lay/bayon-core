'use strict';

// import namespaces
let utils = bayon.utils;
let co = require('co');
let Context = require('./context.js');

module.exports = wrapper;

let terminateMethods = [
    'render', 'send', 'json', 'jsonp', 'redirect', 'download', 'sendfile'
];

/*
 * check of provided parameter is a generator function
 * @param {any} fn
 */
function isFunction(fn) {
    return (typeof fn === 'function');
}

/*
 * wrap as a response method for express
 * @param {Function} fn
 */
function getWrappedResponse(fn) {
    return function () {
        this.terminated = true; // use this to prevent the method call after send or render method is called
        fn.apply(this, arguments);
    };
}

/*
 * Convert the provided route handler to handler as
 * @param {Function} fn
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function callHandler(fn, req, res, next) {
    let context = new Context(req, res);
    if (utils.isGeneratorFunction(fn)) {
        co(fn).call(context, function (err) {
            if (err || !res.terminated) {
                next(err);
            }
        });
    } else {
        fn.call(context);
        if (!res.terminated) {
            next();
        }
    }
}

/*
 * Convert the provided route handler to handler as
 * @param {Function} fn
 */
function getHandler(fn) {
    if (isFunction(fn) && fn.actionHandler) {
        return function (req, res, next) {
            terminateMethods.map(function (method) {
                res[method] = getWrappedResponse(res[method]);
            });
            callHandler(fn, req, res, next);
        };
    } else {
        return fn;
    }
}

/*
 * wrap the provided method
 * @param {Function} fn
 */
function getWrappedAction(fn) {
    return function () {
        let args = utils._.toArray(arguments);
        let length = args.length;
        if (args && length) {
            // expect the last arguments always callback of route handler
            args[length - 1] = getHandler(args[length - 1]);
        }
        return fn.apply(this, args);
    };
}

/*
 * Get list of http methods
 */
function getHttpMethod() {
    let http = require('http');
    let lowerCaseMethods = http.METHODS.map(function (method) {
        return method.toLowerCase();
    });
    return lowerCaseMethods;
}

/*
 * wrap app methods with generator function handler
 */
function wrapper(app) {
    let httpMethods = getHttpMethod();
    httpMethods = httpMethods.concat(['use', 'all', 'param']);
    httpMethods.forEach(function (method) {
        app[method] = getWrappedAction(app[method]);
    });
    return app;
}
