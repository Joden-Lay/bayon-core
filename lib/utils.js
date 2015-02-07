'use strict';

let app = bayon.app;
let path = require('path');
let uuid = require('node-uuid');
let assert = require('assert');
let fs = require('fs'); // load fs lib
let _ = require('underscore');
let crypto = require('crypto');
let configCache = {};
let nodeUtil = require('util');
let STATUS_CODES = require('http').STATUS_CODES;

_.str = require('underscore.string'); // load underscore.string lib


_.mixin(_.str.exports());
_.mixin(nodeUtil);

let Utilities = module.exports = _;

// exports dependency utils
Utilities.validator = require('validator');
Utilities.co = require('co');


/**
 * load classes with in directory
 * @return {Array<class>}
 * @api public
 */
Utilities.loadClasses = function (options) {
    assert(options, 'options is not provided');
    assert(options.loaderPath, 'options.loaderPath is not provided');
    if (!options.replacement) {
        options.replacement = '';
    }
    options.replacement += '.js';

    let loadPath = path.join(app.path, 'app', options.loaderPath);

    // get files in passed directory
    // since this one is run on start it's ok to use Sync
    let loaderFiles = fs.readdirSync(loadPath);

    // declare letiable that going to use in loop
    let classes = [];
    _.each(loaderFiles, function (classPath) {
        if (Utilities.endsWith(classPath, options.replacement)) {
            let className = classPath.replace(options.replacement, '');
            let classDeclaration = require(path.resolve(loadPath, classPath));
            let identifier = options.makeInstant ? instantiate(classDeclaration) : classDeclaration;
            if (options.parser && _.isFunction(options.parser)) {
                identifier = options.parser(className, identifier);
            }
            classes[className] = identifier;
        }
    });
    // return Array of classes
    return classes;
};

/**
 * get resolve path with root configuration
 * @return {String} resolved path
 * @api public
 */
Utilities.path = function (target) {
    if (app && app.path) {
        return path.resolve(app.path, target); //use app root if it there
    } else {
        return path.resolve('../../..', target); // else use tricky resolve path
    }
};

/**
 * get uuid V1
 * @return {String}
 * @api public
 */
Utilities.getUuidV1 = function () {
    return uuid.v1.apply(this, arguments);
};

/**
 * get uuid V4
 * @return {String}
 * @api public
 */
Utilities.getUuidV4 = function () {
    return uuid.v4.apply(this, arguments);
};

/**
 * get timestamp
 * @param {Date} date optional
 * @return {Number}
 * @api public
 */
Utilities.getTimeStamp = function (date) {
    date = date || new Date();
    return date.getTime();
};

/**
 * get string data
 * @param {String} data to be encryped
 * @param {Object} options: algorithms, encoding
 * @return {String}
 * @api public
 */
Utilities.getHash = function (data, options) {
    options = options || {
        algorithms: 'sha256',
        encoding: 'base64'
    };
    let hash = crypto.createHash(options.algorithms);
    return hash.update(data).digest(options.encoding);
};

/**
 * get Configuration
 * @param {String} config configuration file name without extension
 * @param {Boolean} get fresh object instead of cached edition
 * @api public
 * @return {String}
 */
Utilities.getConfig = function (config, fresh) {
    // ensure config is provided
    assert(config, 'config name is provided');
    // if fresh flag is true then ignore about the cache
    if ((fresh !== true) && (config in configCache)) {
        return configCache[config]; // return from cache
    }

    let configObject = getConfigObject(config);
    // make sure config path is exist before call require and cahche;
    assert(configObject, config + ' configuration file does not exist');

    // cache loaded module
    configCache[config] = configObject;
    return configCache[config]; // return newly cached
};


/**
 * A short hand method to require the core with start point from executing root directory
 * @param {string} file name to be laod
 * @api public
 */
Utilities.require = function (name) {
    return require(path.resolve(app.path, name));
};

/**
 * Wrap a regular callback `fn` as a thunk.
 * @param {Function} fn
 * @return {Function}
 * @api public
 */
Utilities.thunkify = thunkify;

/**
 * execute function inside a try catch block
 * @param {Function} fn
 * @return {Mixed} result
 * @api public
 */
Utilities.tryInvoke = function (fn) {
    try {
        return fn.apply(this, _.toArray(arguments).splice(1));
    } catch (ex) {
        return false;
    }
};

/**
 * clone an object.
 * @param {Object} source
 * @return {Object}
 * @api public
 */
Utilities.clone = function (source) {
    if (!_.isObject(source)) {
        return source;
    }
    return _.isArray(source) ? source.slice() : _.extend({}, source);
};

/*
 * check of provided parameter is a generator function
 * @param {Function} fn
 * @return {Boolean}
 * @api public
 */
Utilities.isGeneratorFunction = function (fn) {
    return _.isFunction(fn) && (fn.constructor.name === 'GeneratorFunction');
};

/**
 * Generate an `Error` from the given status `code`
 * and optional `msg`.
 * @param {Number} code
 * @param {String} msg
 * @return {Error}
 * @api public
 */
Utilities.error = function (code, msg) {
    let err = new Error(msg || STATUS_CODES[code]);
    err.status = code;
    return err;
};

Utilities.getStatusMessage = function (code) {
    return STATUS_CODES[code];
};

/**
 * get string data
 * @param {String} config name
 * @param {String} ext extension of file
 * @param {String} current executing environment
 * @return {String}
 * @api private
 */
function loadConfig(config, env) {
    env = env || ''; // default as empty
    //resolve for absolute path of config file
    let configPath = path.resolve(app.path, 'app/config', env, config);
    //path is exist return the path else give a false flag

    let pacc = Utilities.tryInvoke(function () {
        return require(configPath);
    });
    return pacc;
}

/**
 * get string data
 * @param {String} config name
 * @return {String}
 * @api private
 */
function getConfigObject(config) {
    // test of <config> in global environment directory is provided
    let globalConfig = loadConfig(config) || {};
    // test of <config> in specific environment directory is provided
    let localConfig = loadConfig(config, app.environment) || {};

    return _.extend(globalConfig, localConfig);
}

function thunkify(fn, context) {
    assert('function' === typeof fn, 'function required');
    return function () {
        let args = [];
        context = context || this;
        for (let i = 0, l = arguments.length; i < l; ++i) {
            args[i] = arguments[i];
        }
        return thunkedFunc(fn, args, context);
    };
}

function instantiate(ClassDeclaration) {
    return new ClassDeclaration();
}

/**
 * return thunked function
 * @param {Function} fn
 * @param {Array} args
 * @param {Object} context
 * @return {Function}
 * @api private
 */
function thunkedFunc(fn, args, context) {
    return function (done) {
        let called;
        args.push(function () {
            if (called) {
                return;
            }
            called = true;
            done.apply(null, arguments);
        });
        try {
            fn.apply(context, args);
        } catch (err) {
            done(err);
        }
    };
}
