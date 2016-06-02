var shell = require('shelljs');
var client = require('./client');
var logger = require('./logger');

var fs = require('fs');
var parseIni = require('ini').stringify;
var parseXml = require('xml');
var execSync = require('child_process').execSync;
var co = require('co');
var r = require('superagent');
var tree = require('./tree');


function taskRunner(doc) {
    var content = '';
    switch (doc.type) {
        case 'json':
            content = JSON.stringify(tree.Unflatten(doc.json), false, 2);
            break;
        case 'text':
            content = doc.text;
            break;
        default:
            return;
    }
    fs.writeFileSync(doc.path, content);
    try {
        for (var command of doc.commands) {
            shell.exec(command);
        }
    } catch (e) {
        logger.error(e);
    }
}

function deployGit(git) {
    var currCommit = shell
        .cd(git.path)
        .exec('git rev-parse HEAD').stdout;
}

module.exports = (config) => {
    co(function* () {
        var docNames = config.WATCH
        for (var doc of docNames) {
            try {
                var res = yield cb => r
                                .get(config.HTTP + '/admin/filename' + doc)
                                .end(cb);
                var body = res.body;
                if (body.data) {
                    var data = body.data[0];
                    taskRunner(data);
                }
            } catch (e) {
                if (!(e && e.response && e.response.status === 404)) {
                    throw e;
                }
            }
        }

        client.on('error', e => {
            logger.error(e);
            throw e;
        });
        client.on('connected', e => {
            logger.info('Connected');
        });
        client.on('change', doc => {
            logger.info('Received ' + doc.name);
            taskRunner(doc)
        });
        client.on('deploy', git => {
            logger.info('Deploy ' + git.name);
            deployGit(git);
        })

        client.init(config.URL, config.WATCH, config.DEPLOY);
    })
    .catch(err => {
        logger.error(err);
        process.exit(1);
    })
}