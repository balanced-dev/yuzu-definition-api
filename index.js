var path = require('path');
var build = require('yuzu-definition-core').build;
var YuzuSocketComms = require('./yuzu-socket-comms');
var yuzuHelpers = require('yuzu-definition-hbs-helpers');
const options = require(path.join(process.cwd(), 'yuzu.config.js'));

const init = function (req, res, next) {
    var url = req.url.substring(1);

    // Remove query string params
    url = url.split('?')[0];
    
    var urlPaths = url.split('/');
    if(req.method == "OPTIONS") res.end();

    var allPartials =  options.api.files.templates[0];
    var allPartialsArr = options.api.files.templates;
    var previews = options.api.files.templateHTML;

    var imagesDir =  options.api.paths.images.dest;  


    res.set("Access-Control-Allow-Origin", "*"),
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.set("Access-Control-Allow-Headers", "X-Requested-With, content-type, Authorization");

    var body = '';
    req.on('data', function (data) {

        body += data;
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6) {
            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
            req.connection.destroy();
        }
    });

    if (urlPaths[0] === 'setActive' && req.method === 'GET') {

        var wsId = urlPaths[1];
        var blockPath = decodeURIComponent(urlPaths[2]);
        var isActive = urlPaths[3];

        if(wsId> 0) {
            YuzuSocketComms({ action: "setActive", data: { path: blockPath, isActive: isActive } }, wsId);
        }

        res.end();
    }
    else if (urlPaths[0] === 'get' && req.method === 'GET') {

        req.on('end', function () {

            var stateName = '/' + urlPaths[1];

            var result = build.getData(allPartialsArr, stateName);
    
            res.write(JSON.stringify(result, null, 4));
            res.end();
        });

    }
    else if (urlPaths[0] === 'getResolved' && req.method === 'GET') {

        req.on('end', function () {

            var stateName = '/' + urlPaths[1];

            var result = build.getData(allPartialsArr, stateName, true, []);
    
            res.write(JSON.stringify(result, null, 4));
            res.end();
        });

    }
    else if (urlPaths[0] === 'getPreview' && req.method === 'GET') {

        req.on('end', function () {

            var stateName = '/' + urlPaths[1];
            var errors = [];

            var result = build.renderState(allPartialsArr, stateName, errors);
    
            res.write(result);
            res.end();
        });

    }
    else if (urlPaths[0] === 'getPreviews' && req.method === 'GET') {

        req.on('end', function () {

            var result = build.getPreviews(previews);
    
            res.write(JSON.stringify(result, null, 4));
            res.end();
        });

    }
    else if (urlPaths[0] === 'getImages' && req.method === 'GET') {

        req.on('end', function () {

            var result = build.getFilePaths(imagesDir);
            var pathRoot = path.normalize(base.devRoot);

            // Remove devRoot (e.g. '/_dev') and change '\\' -> '/' in paths
            for (var i = 0, len = result.length; i < len; i++) {
                result[i] = result[i].split(pathRoot)[1].split('\\').join('/')
            }
    
            res.write(JSON.stringify(result, null, 4));
            res.end();
        });

    }
    else if (urlPaths[0] === 'getChildStates' && req.method === 'GET') {

        var state = '/' + urlPaths[1];
        var result = build.getChildStates(allPartialsArr, state);

        res.write(JSON.stringify(result, null, 4));
        res.end();
    }
    else if (urlPaths[0] === 'getRefPaths' && req.method === 'GET') {

        var block = '/' + urlPaths[1];
        var result = build.getRefPaths(allPartialsArr, block);

        res.write(JSON.stringify(result, null, 4));
        res.end();
    }
    else if (urlPaths[0] === 'getEmpty' && req.method === 'GET') {

        var blockName = '/' + urlPaths[1];
        var blockPath = '';
        if(urlPaths.length > 2) {
            blockPath = decodeURIComponent(urlPaths[2]);
        }

        var result = build.getEmpty(allPartialsArr, blockName, blockPath);

        res.write(JSON.stringify(result, null, 4));
        res.end();
    }
    else if (urlPaths[0] === 'preview' && req.method === 'POST') {

        req.on('end', function () {

            var errors = [];
            var response = JSON.parse(body);

            var blockPath = path.join(allPartials, response.path);

            build.register(allPartialsArr, yuzuHelpers);
            var externals = build.setup(allPartialsArr);

            var renderedTemplate = build.renderPreview(JSON.stringify(response.root), response.refs, blockPath, externals, errors);

            YuzuSocketComms({ action: "preview", data: renderedTemplate }, response.wsId);
        });
        res.end();
    }
    else if (urlPaths[0] === 'save' && req.method === 'POST') {

        req.on('end', function () {

            var response = JSON.parse(body);

            var blockPath = path.join(allPartials, response.path);

            build.register(allPartialsArr, yuzuHelpers);

            build.save(allPartialsArr, JSON.stringify(response.root, null, 4), blockPath, response.refs);

        });
        res.end();
    }
}

module.exports = init;