'use strict';

let path = require('path');
let debug = require('debug')('bayon:core');

// exports bayon global variable and initialize it's properties
global.bayon = {};
let app = bayon.app = {};
let utils = bayon.utils = require('./utils');
let components = bayon.components = {};

module.exports = Bayon;

function bindPort() {
    // Assign port to listen
    app.port = app.config.port || process.env.NODE_PORT;

    // When no external configuration for using port
    // bind app to web standard port
    if (!app.port) {
        let useHttps = utils.getConfig('https');
        if (app.environment !== 'production') {
            // bind to https well known port if useHttps is marked
            app.port = useHttps ? 8443 : 8080;
        } else {
            // bind to http well known port
            app.port = useHttps ? 443 : 80;
        }
    }
    debug('Bind port to %s', app.port);
}

function setEnvironment(options) {
    options = options || {};

    // use default directory backward if root is node provided
    let root = options.root || path.resolve(__dirname, '../../..');

    // If NODE_ENV is provided then use it
    // else give a 'development' as it execute environment
    let env = options.env || process.env.NODE_ENV || 'development';

    app.path = root;
    app.environment = env;

    // load the app configure
    app.config = utils.getConfig('app');
    debug('Loaded with environment %s', app.environment);
}

function setupLocale() {
    components.app.use(require('./locale')(utils.getConfig('locale')));
}

function setupRunMode() {
    if (app.config.debug) {
        let errorHandler = require('errorhandler');
        // development configuations
        components.app.use(errorHandler({
            dumpExceptions: true,
            showStack: true
        }));
        // enable express logger if we are on development
        components.app.use(require('morgan')('dev'));
    } else {
        let compression = require('compression');
        let compressionOptions = app.config.compression ? app.config.compressionOptions : {};
        components.app.use(compression(compressionOptions));
    }
}

function setupSession() {
    let sessionConfig = utils.getConfig('session');
    let session = require('express-session');

    if (sessionConfig.store === 'redis') {
        let RedisStore = require('connect-redis')(session);
        sessionConfig.store = new RedisStore({
            client: bayon.memStore.createClient()
        });
    } else if (sessionConfig.store === 'memcached') {
        let MemcachedStore = require('connect-memcached')(session);
        sessionConfig.store = new MemcachedStore({
            client: bayon.memStore.createClient()
        });
    } else if (utils._.isFunction(sessionConfig.store)) {
        sessionConfig.store = sessionConfig.store(session, components.express, components.app);
    }
    components.app.use(session(sessionConfig));
}

function appSetup() {
    utils.tryInvoke(function () {
        utils.require('app/_before');
    });
    setupSession(); // setup express session
    setupLocale(); // setup locale
    setupRunMode(); // setup running mode
    bindView(); // set view engine
    utils.tryInvoke(function () {
        utils.require('app/_after');
    });
}

function startup() {
    if (process.env.NODE_IP) {
        //start listening to requests and bind with specific IP
        components.server.listen(app.port, process.env.NODE_IP);
    } else {
        //start listening to requests
        components.server.listen(app.port);
    }
    console.log('Server started listen on port %s', app.port);
}

function setupComponents() {
    debug('Setup app');
    bayon.memStore = require('./mem-store');
    // load express lib
    components.express = require('express');
    // load express and wrap it to our generator handler lib
    components.app = require('./generator-handler')(components.express());
    // set express environment
    components.app.set('env', app.environment);
    // disable express x-powered-by header
    components.app.disable('x-powered-by');

    // load express configurations
    if (app.config.express) {
        for (let k in app.config.express) {
            if (app.config.express.hasOwnProperty(k)) {
                components.app.set(k, app.config.express[k]);
            }
        }
    }

    appSetup();
    app.run = startup;
}

function bindRoute() {
    debug('Bind static file solve');
    if (app.config.directive.public) {
        let staticPath = utils.path(app.config.directive.public);
        let staticResolve = components.express.static(staticPath);
        components.app.use(staticResolve);
    }

    debug('Binding HTTP routes');
    //map configured route actions
    require('./router');
}

function loadModel() {
    debug('Loading models');
    utils.tryInvoke(function () {
        utils.require('app/model/_before');
    });
    bayon.model = require('./model');
    utils.tryInvoke(function () {
        utils.require('app/model/_after');
    });
}

function bindView() {
    if (!app.config.view.enable) {
        return;
    }
    debug('Binding view engine');
    let swig = require('swig');
    components.viewEngine = swig;
    // This is where all the magic happens!
    components.app.engine('html', swig.renderFile);

    components.app.set('view engine', 'html');
    components.app.set('views', utils.path('app/view'));

    // use Express's caching instead
    components.app.set('view cache', app.config.view.cache);
    // To disable Swig's cache
    swig.setDefaults({
        cache: false
    });
}

function bindSocket() {
    debug('Binding socket routes');
    if (app.config.socket.enable === true) {
        let route = utils.tryInvoke(function () {
            return utils.require('app/' + app.config.socket.route);
        });
        bayon.socketRouter = route;
        // load socket lib
        bayon.socketManager = require('./socket');
    }
}

function loadMvcCore() {
    debug('Setup MVC core');
    bayon.sequelize = require('sequelize');
    bayon.db = require('./database');
    loadModel();
    bayon.filter = utils.loadClasses({
        loaderPath: 'filter'
    });
    bayon.controller = utils.loadClasses({
        loaderPath: 'controller'
    });
    bayon.httpRouter = utils.tryInvoke(function () {
        return utils.require('app/' + app.config.http.route);
    });
}

function initializeServer() {
    debug('Iniitliazing server');
    let useHttps = app.config.http.secure;
    //Use https as default server handler
    let httpServer = useHttps ? require('https') : require('http');

    // create https instance
    components.server =
        useHttps ?
        httpServer.createServer(components.app, utils.getConfig('https')) :
        httpServer.createServer(components.app);
}

function setTitle(options) {
    try {
        if (options && options.root) {
            let pjson = require(options.root + '/package.json');
            if (pjson && pjson.name) {
                process.title = pjson.name;
                return;
            }
        }
    } catch (err) {}
    process.title = 'Bayon';
}

function Bayon(options) {
    setTitle(options);
    setEnvironment(options);
    bindPort();
    setupComponents();
    loadMvcCore();
    initializeServer();
    bindRoute();
    bindSocket();
    return app;
}
