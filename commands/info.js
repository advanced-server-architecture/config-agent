'use strict';

const os = require('os');
const child_process = require('child_process');
const _ = require('lodash');
const fs = require('fs');
const shell = require('shelljs');
const guard = require('../guard');
const sys = require('../sys');

module.exports = function(type, config, cb) {
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
        case 'list': {
            let result = guard.list().map(child => ({
                pid: child.pid,
                createdAt: child.createdAt,
                updatedAt: child.updatedAt,
                restartCount: child.restartCount,
                status: child.status,
                name: child.name,
                location: child.location,
                opts: child.opts
            }));
            cb(null, result);
        }
            break;
    }
};