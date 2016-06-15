#!/usr/bin/env node
'use strict';
const program = require('commander');
const agent = require('./agent');
const fs = require('fs');
const path = require('path');



program
    .option('-u, --url <url>', 'Server url')
    .option('-n, --name <name>', 'Server alias')
    .option('-p, --path <path>', 'Local pepo storage')
    .parse(process.argv);

const url = program.url || '127.0.0.1';
const name = program.name || '';
const pwd = process.env.PWD;
const _path = path.resolve(pwd, program.path || './');

agent(url, name, _path);
