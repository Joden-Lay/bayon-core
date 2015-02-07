'use strict';

// import namespaces
let utils = bayon.utils;


let resMethods = [
    'render', 'send', 'json', 'jsonp', 'redirect', 'download', 'sendfile', 'status'
];

let resProperties = [
    'locals', 'headersSent', '__'
];

let reqMethods = [
    'render', 'send', 'json', 'jsonp', 'redirect', 'download', 'sendfile',
    'session'
];

let reqProperties = [
    'params', 'body', 'query', 'cookies', 'signedCookies', 'path', 'xhr'
];

module.exports = Context;

function Context(req, res) {
    this.req = req;
    this.res = res;
}

function bindMethods(methods, context) {
    utils.each(methods, function (method) {
        Context.prototype[method] = function () {
            this[context][method].apply(this[context], utils.toArray(arguments));
        };
    });
}

function defineFields(properties, context) {
    properties.forEach(function (propName) {
        Object.defineProperty(Context.prototype, propName, {
            get: function () {
                return this[context][propName];
            },
            set: function (value) {
                this[context][propName] = value;
            }
        });
    });
}

bindMethods(reqMethods, 'req');
bindMethods(resMethods, 'res');

defineFields(reqProperties, 'req');
defineFields(resProperties, 'res');

Context.prototype.terminate = function (code, message) {
    this.status(code).send(message || utils.getStatusMessage(code));
};
