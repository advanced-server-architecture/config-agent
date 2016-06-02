var shell = require('shelljs');
var client = require('./client');
var logger = require('./logger')();

var fs = require('fs');
var parseIni = require('ini').stringify;
var parseXml = require('xml');
var execSync = require('child_process').execSync;
var co = require('co');
var r = require('superagent');
var tree = require('./tree');

var crypto = require('crypto');

function md5(s) {
    return crypto.createHash('md5').update(s).digest('hex');
}


function taskRunner(doc, flag) {
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
    var origin = '';
    try {
        origin = fs.readFileSync(doc.path);
        origin = origin.toString();
    } catch (e) {
    }
    if (md5(origin) === md5(content) && !flag) {
        return;
    }
    fs.writeFileSync(doc.path, content);
    var path = doc.path.split('/');
    path.pop();
    path = path.join('/')
    try {
        for (var command of doc.commands || []) {
            logger.info(path)
            logger.info(command)
            shell.cd(path).exec(command);
        }
    } catch (e) {
        logger.error(e);
        e.stack && logger.error(e.stack);
        return;
    ``}
    logger.info('Config:' + doc.name + ' updated');
}

function deployGit(git) {
    if (!git) return;
    var path = git.path + '/' + git.repo.split('/')[1];
    if (shell.cd(path).stderr) {
        shell.exec(`mkdir -p ${path}`);
    }
    var currCommit = shell
        .cd(path)
        .exec('git rev-parse HEAD').stdout;
    if (!currCommit) {
        shell
            .cd(git.path)
            .exec(`git clone https://${git.username}:${git.accessToken}@github.com/${git.repo}`);
        currCommit = shell
            .cd(git.path + '/' + git.repo)
            .exec('git rev-parse HEAD').stdout;
    }
    if (currCommit !== git.deployedCommit) {
        shell
            .cd(path)
            .exec(`git checkout ${git.deployedCommit}`);
    }
    if (git.command) {
        var curr = shell.cd(path);
        var commands = git.command.split('\n');
        for (var command of commands) {
            curr.exec(command);
        }
    }
    logger.info('Git:' + git.name + ' deployed');
}

module.exports = (config) => {
    logger = require('./logger')(config.LOGFILE);
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
        var repos = config.DEPLOY; 
        for (var repo of repos) {
            try {
                var res = yield cb => r
                                .get(config.HTTP + '/admin/git/' + repo)
                                .end(cb);
                var body = res.body;
                if (body.data) {
                    var data = body.data[0];
                    deployGit(data);
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
            logger.info('Received config:' + doc.name);
            taskRunner(doc, true)
        });
        client.on('deploy', git => {
            logger.info('Received deploy:' + git.name);
            deployGit(git);
        })

        client.init(config.URL, config.WATCH, config.DEPLOY);
        logger.info('Ageng alive');
    })
    .catch(err => {
        logger.error(err);
        process.exit(1);
    })
}