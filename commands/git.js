'use strict';

const exec = require('../util/exec');
const co = require('co');
const guard = require('../core/guard');
const logger = require('../util/logger');
const fs = require('fs');
const _ = require('lodash');

module.exports = {
    init: function* (project, opts, projectPath, cb) {
        let flag = true;
        let stdout = '';
        const path = projectPath+ '/' + opts.name;
        try {
            fs.statSync(path);
        } catch (e) {
            flag = false;
        }
        if (flag) {
            cb('folder exists');
            throw 'folder exists';
        }
        yield exec
            .run(`mkdir -p ${path}`);
        try {
            logger.info(`cloning repo ${project.repo}`);
            cb(null, 'cloning');
            logger.info(
                yield exec
                    .run(`git clone ` +
                        `https://${project.username}:` +
                        `${project.accessToken}` +
                        `@github.com/${project.repo} ./`, path));
        } catch (e) {
            logger.error(e);
            yield exec.run(`rm -rf ${path}`);
            throw 'unable to clone git';
        }
        const currCommit = (yield exec
                .run('git rev-parse HEAD', path)).trim('\n');
        const name = opts.name;
        delete opts.name;

        guard.add({
            createdAt: Date.now(),
            updatedAt: Date.now(),
            restartCount: 0,
            location: path,
            name: name,
            status: 'stopped',
            _id: project._id,
            git: {
                accessToken: project.accessToken,
                repo: project.repo,
                username: project.username,
                commit: currCommit 
            },
            main: project.main,
            opts: opts,
            pid: -1
        });
        logger.info('done');
    },
    pull: function *(projectId, commit, projectPath, cb) {
        const proc = _.find(guard.list(), { _id: projectId });
        if (!proc) {
            throw `${projectId} is not found`;
        }
        const path = projectPath + '/' + proc.name;
        try {
            fs.statSync(path + '/.git');
        } catch(e) {
            throw `${path} is not a git repo`;
        }

        const currCommit = (yield exec
                .run('git rev-parse HEAD', path)).trim('\n');

        logger.info(`current commit is ${currCommit}`);

        cb(null, 'pulling for latest commit');
        
        if (currCommit !== commit) {
            logger.info(`fetching ${commit}`);
            yield exec
                .run('git fetch', path)
            yield exec
                .run(`git checkout ${commit}`, path); 
            logger.info(`fetched ${commit}`);
        }

        const opts = proc.opts;
        if (Array.isArray(opts.command)) {
            for (const command of opts.command) {
                logger.info(`running ${command}`);
                try {
                    yield exec 
                        .run(command, path)
                } catch (e) {
                    logger.error(e);
                }
            }
        }
        logger.info(`finished updating ${proc.name}`);
        guard.updateCommit(projectId, currCommit);
    }
}