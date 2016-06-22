'use strict';

const exec = require('child_process').exec;
const run = require('util/exec').run;
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const logger = require('util/logger');
const info = require('core/info');

let list = [];

const out = {
    start: function *(_id) {
        const proc = _.find(list, { _id });
        if (!proc) {
            throw (`cannot find project ${proc.name}`);
            return;
        }
        if (proc.status === 'stopped') {
            guard(proc);
        }
    },
    stop: function *(_id) {
        let proc = _.find(list, { _id });
        if (proc) {
            proc.status = 'stopped';
            proc.pid = -1;
            this.save();
            if (proc.process) {
                proc.process.kill('SIGINT');
                logger.info(proc._id + ' stopped');
            }
        }
    },
    remove: function *(_id) {
        let proc = _.find(list, { _id });
        let index = _.findIndex(list, { _id });
        if (proc) {
            if (proc.process) {
                proc.process.kill('SIGINT');
            }
            yield run(`rm -rf ${proc.location}`);
            list.splice(index, 1);
        }
        this.save();
    },
    list() {
        return list;
    },
    add(proc) {
        if (_.find(list, {name: proc.name})) {
            throw (`${proc.name} already exits`);
        }
        list.push(proc);
        this.save();
    },
    restore(content) {
        list = content;  
        for (const child of list) {
            if (child.status === 'running') {
                guard(child);
            }
        }
        logger.info('projects restored, ' + list.length);
    },
    save() {
        let content = []; 

        for (const child of list) {
            content.push({
                createdAt: child.createdAt,
                updatedAt: child.updatedAt,
                restartCount: child.restartCount,
                location: child.location,
                name: child.name,
                status: child.status,
                _id: child._id,
                git: child.git,
                main: child.main,
                opts: child.opts,
                pid: -1
            });
        }
        info.report('project', content);
    }
}

function guard(proc, internal) {
    internal = internal || {};
    const opts = proc.opts;
    const optsRestartLimit = 1;

    logger.info(`Starting location:${proc.location}`);


    const argument = opts.argument || [];
    let env = _.extend({}, process.env);

    env.PWD = proc.location;


    const p = exec(`node` + 
            ` ${argument.join(' ')}` + 
            ` ${proc.location + '/' + proc.main}`,{
        env,
        cwd: env.PWD
    });


    proc.pid = p.pid,
    proc.process = p,
    proc.updatedAt = Date.now();
    proc.status = 'running';
    internal.shortRestartCount = internal.shortRestartCount || 0;

    out.save();

    p.stdout.on('data', data => {
        logger.info(proc.name, data);
    });

    p.stderr.on('data', err => {
        logger.error(proc.name, err);
    });

    p.on('exit', (code, e) => {
        if (!code) {
            return;
        }
        if (proc.status === 'stopped') {
            return;
        }
        proc.status = 'stopped';
        proc.pid = -1;
        out.save();
        
        if (internal.shortRestartCount >= optsRestartLimit) {
            return;
        }
        internal.shortRestartCount++;
        guard(proc, internal);
    });

}


module.exports = out;
