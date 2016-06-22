#!/usr/bin/env node
'use strict';
const program = require('commander');
const agent = require('./agent');
const fs = require('fs');
const path = require('path');



program
    .option('-u, --url <url>', 'Config Server url')
    .option('-n, --name <name>', 'Agent alias')
    .option('-r, --root <root>', 'Local pepo storage')
    .option('-p, --port <port>', 'Config Server port')
    .parse(process.argv);

const url = program.url || '127.0.0.1';
const port = program.port || 3010;
const name = program.name || '';
const pwd = process.env.PWD;
const _path = path.resolve(pwd, program.root || './');

agent(url, name, _path, port);
