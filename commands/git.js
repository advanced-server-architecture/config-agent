'use strict';

const shell = require('shelljs');
const co = require('co');
const guard = require('../guard');
const logger = require('../logger');
const fs = require('fs');
const _ = require('lodash');

module.exports = {
    init(params, config, cb) {
        co(function* () {
            const project = params.project 
            let opts = params.opts;
            opts._id = project._id;
            opts.repo = project.repo;
            opts.accessToken = project.accessToken;
            opts.main = project.main;
            opts.username = project.username;
            let flag = true;
            let path = config.path + '/' + opts.name;
            try {
                fs.statSync(path);
            } catch (e) {
                flag = false;
            }
            if (flag) {
                throw 'folder exists';
            }
            logger.info(shell
                .exec(`mkdir -p ${path}`).stdout);
            try {
                logger.info(`cloning repo ${project.repo}`);
                let stdout = yield cb => shell
                    .cd(path)
                    .exec(`git clone ` +
                        `https://${opts.username}:${opts.accessToken}` + 
                        `@github.com/${opts.repo} ./`, cb);
                for (const o of stdout) {
                    logger.info(o);
                }
            } catch (e) {
                throw 'unable to clone git'
            }
            guard.add({
                createdAt: Date.now(),
                updatedAt: Date.now(),
                restartCount: 0,
                location: path,
                name: opts.name,
                status: 1,
                opts: opts,
                pid: -1
            });
            logger.info('done');
        }) 
        .then(() => {
            if (cb) {
                cb(null);
            }
        })
        .catch(e => {
            if (cb) {
                cb(e) 
            } else {
                throw e;
            }
        })
    },
    pull(params, config, cb) {
        co(function* () {
            const name = params.name;
            logger.info(`pulling for ${name}`);
            const commit = params.commit;
            const path = config.path + '/' + name;
            try {
                fs.statSync(path + '/.git');
            } catch(e) {
                throw `${path} is not a git repo`;
            }
            const currCommit = shell
                    .cd(path)
                    .exec('git rev-parse HEAD').stdout.trim('\n');
            logger.info(`current commit is ${currCommit}`);
            
            if (currCommit !== commit) {
                logger.info(`fetching ${commit}`);
               yield cb => shell
                    .cd(path)
                    .exec('git fetch', cb)
                yield cb => shell
                    .cd(path)
                    .exec(`git checkout ${commit}`, cb); 
                logger.info(`fetched ${commit}`);
            }

            const proc = _.find(guard.list(), {name});
            const opts = proc.opts;
            if (Array.isArray(opts.command)) {
                for (const command of opts.command) {
                    logger.info(`running ${command}`);
                    yield cb => shell
                        .cd(path)
                        .exec(command, cb)
                }
            }
            logger.info(`finished updating ${name}`);

        }) 
        .then(() => {
            if (cb) {
                cb(null);
            }
        })
        .catch(e => {
            if (cb) {
                cb(e) 
            } else {
                throw e;
            }
        })
    }
}