var path = require('path');
var build = require('block-templates-parse').build;
var YuzuSocketComms = require('./yuzu-socket-comms');

const init = function (req, res, next) {
    var url = req.url.substring(1);
    var paths = url.split('/');
    if(req.method == "OPTIONS") res.end();

    var templatePartials = "./_dev/_templates/src/";
    var layoutsDir = "./_dev/_templates/layouts/";
    var previews = "./_dev/_templates/html/";

    var body = '';
    req.on('data', function (data) {

        body += data;
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6) {
            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
            req.connection.destroy();
        }
    });

    if (paths[0] === 'setActive' && req.method === 'GET') {

        var wsId = paths[1];
        var blockPath = decodeURIComponent(paths[2]);
        var isActive = paths[3];

        if(wsId> 0) {
            YuzuSocketComms({ action: "setActive", data: { path: blockPath, isActive: isActive } }, wsId);
        }

        res.end();
    }
    else if (paths[0] === 'get' && req.method === 'POST') {

        req.on('end', function () {

            var errors = [];
            var response = JSON.parse(body);

            var stateName = '/' + response.stateName;
            var result = build.getData(templatePartials, stateName);
    
            res.write(JSON.stringify(result, null, 4));
            res.end();
        });

    }
    else if (paths[0] === 'getPreviews' && req.method === 'GET') {

        req.on('end', function () {

            var result = build.getPreviews(previews);
    
            res.write(JSON.stringify(result, null, 4));
            res.end();
        });

    }
    else if (paths[0] === 'getChildStates' && req.method === 'GET') {

        var state = '/' + paths[1];
        var result = build.getChildStates(templatePartials, state);

        res.write(JSON.stringify(result, null, 4));
        res.end();
    }
    else if (paths[0] === 'getRefPaths' && req.method === 'GET') {

        var block = '/' + paths[1];
        var result = build.getRefPaths(templatePartials, block);

        res.write(JSON.stringify(result, null, 4));
        res.end();
    }
    else if (paths[0] === 'getEmpty' && req.method === 'GET') {

        var blockName = '/' + paths[1];
        var blockPath = '';
        if(paths.length > 2) {
            blockPath = decodeURIComponent(paths[2]);
        }

        var result = build.getEmpty(templatePartials, blockName, blockPath);

        res.write(JSON.stringify(result, null, 4));
        res.end();
    }
    else if (paths[0] === 'preview' && req.method === 'POST') {

        req.on('end', function () {

            var errors = [];
            var response = JSON.parse(body);

            var blockPath = path.join(templatePartials, response.path);

            build.register(templatePartials, $.blockHbsHelpers);
            var externals = build.setup(templatePartials);

            var renderedTemplate = build.renderPreview(JSON.stringify(response.root), response.refs, blockPath, externals, errors);

            YuzuSocketComms({ action: "preview", data: renderedTemplate }, response.wsId);
        });
        res.end();
    }
    else if (paths[0] === 'save' && req.method === 'POST') {

        req.on('end', function () {

            var errors = [];
            var response = JSON.parse(body);

            var blockPath = path.join(templatePartials, response.path);

            build.register(templatePartials, $.blockHbsHelpers);

            var renderedTemplate = build.save(templatePartials, layoutsDir, JSON.stringify(response.root, null, 4), blockPath, response.refs, errors);

            build.savePreview(previews + response.previewPath, renderedTemplate);

        });
        res.end();
    }
}

module.exports = init;