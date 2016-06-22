'use strict'
const os = require('os');
const io = require('socket.io-client');
const fs = require('fs');
const guard = require('./core/guard');
const sys = require('./util/sys');
const logger = require('./util/logger');
const moment = require('moment');
const commander = require('./command');
const info = require('./core/info');
const file = require('./commands/file');


const co = require('co');
const r = require('superagent');

const sleep = (ms) => new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
});

function *killChildren() {
    let list = guard.list();
    for (const child of list) {
        if (child.status === 'running') {
            const signal = (function* () {
                yield new Promise((resolve) => {
                    child.process.on('close', resolve);
                });
            })();
            child.process.kill('SIGINT');
            yield signal;
        }
    } 
}

function onAgentExit(exit) {
    co(function* () {
        yield killChildren(); 
        sys.stop();
        if (exit) {
            process.exit();
        }
    })
    .catch(e => {
        logger.error(e);
    })
    
}


module.exports = (url, name, path, port) => {

    const HOME = process.env.HOME;
    try {
        fs.mkdirSync(`${HOME}/.config-agent`);
    } catch(e) {

    }

    process.env.CONFIG_HOME = `${HOME}/.config-agent`;

    co(function* () {
        process.on('exit', onAgentExit);
        process.on('SIGINT', onAgentExit.bind(null, true));

        let _count = 0;
        let websocketPort;
        let refreshInterval = 1000;

        let _id = '';

        try {
            _id = fs.readFileSync(`${process.env.CONFIG_HOME}/._id`).toString();
        } catch (e) {

        }

        while (_count < 10) {
            try {
                const websocket = yield cb => r
                            .get(`${url}:${port}/websocket`).end(cb);
                const body = websocket.body;
                websocketPort = body.port;
                refreshInterval = parseInt(body.interval)
                break;
            } catch (e) {
                _count++;
                yield sleep(3000)
            }
        }


        if (!websocketPort) {
            throw new Error('Cannot connect to server');
        }



        const client = io('ws://' + url + ':' + websocketPort);

        while (true) {
            yield cb => client.on('connect', cb);
            logger.info('Agent connected');

            client.emit('online', {
                _id,
                name,
                version: require('./package.json').version
            });

            commander.init({
                path
            });

            _id = yield cb => client.on('_id', cb.bind({}, null));
            fs.writeFileSync(`${process.env.CONFIG_HOME}/._id`, _id);

            logger.info(`Ageng alive#${_id}`);


            client.on('call', (callId, command, argument) => {
                logger.debug(`#${callId}`, command);
                commander.exec(command, argument, (err, res) => {
                    if (err) {
                        logger.error(`#${callId}`, err)
                        return client.emit('callback', callId, err);
                    }
                    logger.info(`#${callId}`, res);
                    client.emit('callback', callId, null, res);
                });
            });

            info.install(client.emit.bind(client, 'updateInfo'));
            info.updateInfo(refreshInterval);

            const projectResult = yield cb => 
                r.get(`${url}:${port}/agent/${_id}/project`, cb);
            guard.restore(projectResult.body.data[0].project);
            const fileResult = yield cb => 
                r.get(`${url}:${port}/agent/${_id}/file`, cb);
            file.restore(fileResult.body.data[0].file, path);
            yield cb => client.on('disconnect', cb.bind({}, null));
            info.uninstall();
            yield killChildren();
            logger.info('Agent disconnected');
        }
    })
    .catch(err => {
        if (err.stack) {
            logger.error(err.stack);
        } else {
            logger.error(err);
        }
        process.exit(1);
    })
}