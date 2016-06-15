'use strict';

const os = require('os');
const child_process = require('child_process');
const _ = require('lodash');
const fs = require('fs');
const shell = require('shelljs');
const guard = require('../guard');
const sys = require('../sys');
const logger = require('../logger');
const file = require('./file');

module.exports = function(type, config, params, cb) {
    switch (type) {
        case 'memory':
            cb(null, {
                freemem: os.freemem(),
                totalmem: os.totalmem()
            });
            break;
        case 'repo': {
            let result = [];
            try {
                const repos = fs.readdirSync(config.path);
                for (const repo of repos) {
                    const commit = shell
                                .cd(config.path + '/' + repo)
                                .exec('git rev-parse HEAD').stdout
                                .trim('\n')
                    let name = shell
                                .cd(config.path + '/' + repo)
                                .exec('git remote -v');
                    name = name.split('\t')[1].split(' ')[0].split('/');
                    name = name[name.length - 1];
                    name = name.split('.')
                    name.pop();
                    name = name.join('.');
                    result.push({
                        git: name,
                        name: repo,
                        head: commit
                    });
                }
            } catch (e) {
            }
            cb(null, result);
        }
            break;
        case 'ps': {
            let result = sys();
            cb(null, result) ;
            break;
        }
        case 'start': 
            guard.start(params);
            cb(null, 'OK');
            break;
        case 'stop':
            guard.stop(params.pid);
            cb(null, 'OK');
            break;
        case 'kill':
            guard.kill(params.name);
            cb(null, 'OK');
            break;
        case 'restart':
            guard.restart(params.name);
            cb(null, 'OK');
            break;
        case 'list': {
            let result = [];
            for (const child of guard.list()) {
                let path = child.location;
                let t = child.location.split('/');
                if (t[t.length - 1].split('.').length > 1) {
                    t.pop();
                    path = t.join('/');
                }
                let isGit = true;
                try {
                    fs.statSync(path + '/.git');
                } catch(e) {
                    isGit = false;
                }
                const commit = isGit 
                            ? 
                            shell
                                .cd(path)
                                .exec('git rev-parse HEAD').stdout.trim()
                            :
                            '';
                result.push({
                    pid: child.pid,
                    createdAt: child.createdAt,
                    updatedAt: child.updatedAt,
                    restartCount: child.restartCount,
                    status: child.status,
                    name: child.name,
                    location: child.location,
                    opts: child.opts,
                    commit
                });
            }
            cb(null, result);
        }
            break;
        case 'ls':
            cb(null, file.list())
            break;
        case 'cat':
            cb(null, file.get(config.path, params.name))
            break;
        case 'log': 
            cb(null, logger.get(params.size, params.page));
            break;
    }
};