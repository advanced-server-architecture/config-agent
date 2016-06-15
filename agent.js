'use strict'

const commandInfo = require('./commands/info');
const commandGit = require('./commands/git');
const commandFile = require('./commands/file');

const shell = require('shelljs');
const os = require('os');
const io = require('socket.io-client');
const fs = require('fs');
const guard = require('./guard');
const debug = require('./debug');
const logger = require('./logger');
const moment = require('moment');


const co = require('co');
const r = require('superagent');

const sleep = (ms) => new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
});


function onAgentExit(exit) {
    let list = guard.list();
    for (const child of list) {
        if (child.status === 0) {
            child.process.kill('SIGINT');
        }
    }
    logger.save(`${process.env.CONFIG_HOME}/${moment().format('YYYY-MM-DD')}.log`);
    if (exit) {
        process.exit();
    }
}

module.exports = (url, name, path) => {

    const HOME = process.env.HOME;
    try {
        fs.mkdirSync(`${HOME}/.config-agent`);
    } catch(e) {

    }

    process.env.CONFIG_HOME = `${HOME}/.config-agent`;

    co(function* () {
        guard.restore();
        commandFile.restore();
        process.on('exit', onAgentExit);
        process.on('SIGINT', onAgentExit.bind(null, true));

        let _count = 0;
        let websocketPort;

        while (_count < 10) {
            try {
                const websocket = yield cb => r.get(url + ':3010/websocket').end(cb);
                websocketPort = websocket.text;
                break;
            } catch (e) {
                _count++;
                yield sleep(1000)
            }
        }

        if (!websocketPort) {
            throw new Error('Cannot connect to server');
        }


        let mac = '';


        try {
            mac = fs.readFileSync(`${process.env.CONFIG_HOME}/.mac`).toString();
        } catch (e) {

        }


        if (mac === '') {
            const interfaces = os.networkInterfaces();
            for (const key in interfaces) {
                const i = interfaces[key];
                for (const net of i) {
                    if (net.mac !== '00:00:00:00:00:00') {
                        mac = net.mac;
                        break; 
                    }
                }
            }
            if (mac === '') {
                throw new Error('Mac address not found');
            }
            fs.writeFileSync(`${process.env.CONFIG_HOME}/.mac`, mac);
        }

        mac = mac.split(':').join('');




        const client = io('ws://' + url + ':' + websocketPort);

        client.on('connect_error', e => {
            console.log(e);
        });

        client.on('connect_timeout', e => {
            console.log(e);
        })

        client.on('disconnect', e => {
            console.log('disconnect', e)
        })

        client.on('connect', e => {
            console.log('connected')
            client.emit('online', {
                uid: mac,
                name
            });
        });


        client.on('command', (command, params) => {
            logger.info(`Start executing ${command}, ${JSON.stringify(params || {})}`);
            switch (command) {
                case 'init':
                    commandGit.init(params, {
                        path
                    }, (err) => {
                        if (err) {
                            logger.error(err);
                        } /*else {
                            client.emit('deployed', params.git._id);
                        }*/
                    });
                    break;
                case 'pull':
                    commandGit.pull(params, {
                        path
                    }, (err) => {
                        if (err) {
                            logger.error(err);
                        } /*else {
                            client.emit('deployed', params.git._id);
                        }*/
                    });
                    break;
                case 'pushfile':
                    commandFile.push(params, {
                        path
                    });
                    break;
            }
        });

        client.on('get', (id, uid, type, params) => {
            commandInfo(type, {path }, params, (err, res) => {
                client.emit('return', id, res);
            });
        });
        logger.info('Ageng alive');
    })
    .catch(err => {
        logger.error(err);
        debug(err.message);
        debug(err.stack);
        process.exit(1);
    })
}