'use strict'

const commandInfo = require('./commands/info');
const commandGit = require('./commands/git');

const shell = require('shelljs');
const os = require('os');
const io = require('socket.io-client');
const fs = require('fs');
const guard = require('./guard');
const debug = require('./debug');


const co = require('co');
const r = require('superagent');

const sleep = (ms) => new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
});


function exitHandler(exit) {
    let list = guard.list();

    for (const child of list) {
        child.process.kill('SIGINT');
    }

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
        guard.recover();
        process.on('exit', exitHandler);
        process.on('SIGINT', exitHandler.bind(null, true));

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

        client.on('error', e => {
            throw e;
        });

        client.on('connect', e => {
            client.emit('online', {
                uid: mac,
                name
            });
        });

        const log = (level, message) => client.emit('log', level, message);

        const logger = {
            info(message) {
                log('info', message);
            },
            debug(message) {
                log('info', message);
            },
            error(message) {
                log('error', message);
            }
        };

        client.on('command', (command, params) => {
            logger.info(`Start executing ${command}, ${JSON.stringify(params || {})}`);
            switch (command) {
                case 'deploy':
                    console.log(params);
                    commandGit(params, {
                        path
                    });
                    break;
            }
        });

        client.on('get', (id, uid, type) => {
            commandInfo(type, {path }, (err, res) => {
                client.emit('return', id, res);
            });
        });


        logger.info('Ageng alive');
    })
    .catch(err => {
        //logger.error(err);
        debug(err.message);
        debug(err.stack);
        process.exit(1);
    })
}