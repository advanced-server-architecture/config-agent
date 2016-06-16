'use strict';
const child_process = require('child_process');
const shell = require('shelljs');
const os = require('os');

const osxProcessSummaryRegex ='(?P<total>[0-9]+) total, ' +
                                '(?P<running>[0-9]+) running, ' +
                                '(?P<stopped>[0-9]+) stuck, ' +
                                '(?P<sleeping>[0-9]+) sleeping';
const osxProcessSummaryIndex = 0;
const osxCpuSummaryRegex = '(?P<user>[0-9\\.]+)\\% user, ' + 
                            '(?P<sys>[0-9\\.]+)\\% sys, ' +
                            '(?P<idle>[0-9\\.]+)\\% idle';
const osxCpuSummaryIndex = 3;
const osxProcessRegex = '(?P<pid>[0-9]+)\\-?\\s*' +
                        '(?P<memory>[0-9]+[BKMG])[\\+\\-]?\\s*' +
                        '[\\+\\-]?(?P<cpu>[0-9]+.[0-9]+)\\s*' +
                        '(?P<command>.+)\\s*' +
                        '(?P<upHour>[0-9]{2})\\:' +
                        '(?P<upMinute>[0-9]{2})' +
                        '(?P<upUnit>[\\.\\:])' +
                        '(?P<upSecond>[0-9]{2})';
const osxProcessStartIndex = 12;
const osxProcessEndOffset = 1;
const osxTopArgs = ['-s', '1','-stats', 'pid,mem,cpu,command,time']
const osxHeader = 'Processes'


const linuxProcpsNgProcessSummaryRegex = '(?P<total>[0-9]+) total,\\s+' +
                                '(?P<running>[0-9]+) running,\\s+' +
                                '(?P<sleeping>[0-9]+) sleeping,\\s+' +
                                '(?P<stopped>[0-9]+) stopped';
const linuxProcpsNgProcessSummaryIndex = 1;
const linuxProcpsNgCpuSummaryRegex = '(?P<user>[0-9]+\\.[0-9]+) us,\\s+' +
                            '(?P<sys>[0-9]+\\.[0-9]+) sy,\\s+' +
                            '(?P<ni>[0-9]+\\.[0-9]+) ni,\\s+' +
                            '(?P<idle>[0-9]+\\.[0-9]+) id';
const linuxProcpsNgCpuSummaryIndex = 2;
const linuxProcpsNgProcessRegex = '(?P<pid>[0-9]+)\\s+' +
                            '[^\\s]+' +
                            '[0-9]+\\s+' +
                            '[0-9]+\\s+' +
                            '[0-9]+\\s+' +
                            '[A-Z0-9]\\s+' +
                            '(?P<cpu>[0-9]+\\.[0-9]+)\\s+' +
                            '(?P<memory>[0-9]+\\.[0-9]+)\\s+' +
                            '(?P<upHour>[0-9]+)\\:' +
                            '(?P<upMinute>[0-9]{2})' +
                            '(?P<upUnit>[\\.\\:])' +
                            '(?P<upSecond>[0-9]{2})\\s+' +
                            '(?P<command>.+)';
const linuxProcpsNgProcessStartIndex = 7;
const linuxProcpsNgProcessEndOffset = 0;
const linuxProcpsNgHeader = 'top ';
const linuxProcpsNgTopArgs = ['-b', '-d', '1'];


const linuxProcpsProcessSummaryRegex = '(?P<total>[0-9]+) total,\\s+' +
                                '(?P<running>[0-9]+) running,\\s+' +
                                '(?P<sleeping>[0-9]+) sleeping,\\s+' +
                                '(?P<stopped>[0-9]+) stopped';
const linuxProcpsProcessSummaryIndex = 1;
const linuxProcpsCpuSummaryRegex = '(?P<user>[0-9]+\\.[0-9]+)[\% ]us,\\s+' +
                            '(?P<sys>[0-9]+\\.[0-9]+)[\% ]sy,\\s+' +
                            '(?P<ni>[0-9]+\\.[0-9]+)[\% ]ni,\\s+' +
                            '(?P<idle>[0-9]+\\.[0-9]+)[\% ]id';
const linuxProcpsCpuSummaryIndex = 2;
const linuxProcpsProcessRegex = '(?P<pid>[0-9]+)\\s+' +
                            '[^\\s]+\\s+' +
                            '[\\.\\-\\d\\w]+\\s+' +
                            '[\\.\\-\\d\\w]+\\s+' +
                            '[\\.\\-\\d\\w]+\\s+' +
                            '[\\.\\-\\d\\w]+\\s+' +
                            '[\\.\\-\\d\\w]+\\s+' +
                            '[A-Z]\\s+' +
                            '(?P<cpu>[0-9]+\\.[0-9]+)\\s*' +
                            '(?P<memory>[0-9]+\\.[0-9]+)\\s+' +
                            '(?P<upHour>[0-9]+)\\:' +
                            '(?P<upMinute>[0-9]{2})' +
                            '(?P<upUnit>[\\.\\:])' +
                            '(?P<upSecond>[0-9]{2})\\s+' +
                            '(?P<command>.+)';
const linuxProcpsProcessStartIndex = 7;
const linuxProcpsProcessEndOffset = 0;
const linuxProcpsHeader = 'top ';
const linuxProcpsTopArgs = ['-b', '-d', '1'];


let processSummaryRegex;
let processSummaryIndex;
let cpuSummaryRegex;
let cpuSummaryIndex;
let processRegex;
let processStartIndex;
let processEndOffset;
let topArgs;
let header;

switch (os.platform()) {
    case 'darwin':
        processSummaryRegex = osxProcessSummaryRegex;
        processSummaryIndex = osxProcessSummaryIndex;
        cpuSummaryRegex = osxCpuSummaryRegex;
        cpuSummaryIndex = osxCpuSummaryIndex;
        processRegex = osxProcessRegex; 
        processStartIndex = osxProcessStartIndex;
        processEndOffset = osxProcessEndOffset;
        topArgs = osxTopArgs;
        header = osxHeader;
        break;
    case 'linux': {
        const ifNg = !!shell
                .exec('top -v')
                .stdout
                .match(/procps(-ng)?/)[1];
        if (ifNg) {
            processSummaryRegex = linuxProcpsNgProcessSummaryRegex;
            processSummaryIndex = linuxProcpsNgProcessSummaryIndex;
            cpuSummaryRegex = linuxProcpsNgCpuSummaryRegex;
            cpuSummaryIndex = linuxProcpsNgCpuSummaryIndex;
            processStartIndex = linuxProcpsNgProcessStartIndex;
            processEndOffset = linuxProcpsNgProcessEndOffset;
            processRegex = linuxProcpsNgProcessRegex;
            topArgs = linuxProcpsNgTopArgs;
            header = linuxProcpsNgHeader;
        } else {
            processSummaryRegex = linuxProcpsProcessSummaryRegex;
            processSummaryIndex = linuxProcpsProcessSummaryIndex;
            cpuSummaryRegex = linuxProcpsCpuSummaryRegex;
            cpuSummaryIndex = linuxProcpsCpuSummaryIndex;
            processStartIndex = linuxProcpsProcessStartIndex;
            processEndOffset = linuxProcpsProcessEndOffset;
            processRegex = linuxProcpsProcessRegex;
            topArgs = linuxProcpsTopArgs;
            header = linuxProcpsHeader;
        }
        break;
    }
}


const top = child_process.spawn('/usr/bin/top', topArgs);

let buffer = '';
let __flag = false;

top.stdout.on('data', data => {
    data = data.toString().trim();
    if (data.substr(0, header.length) === header) {
        if (buffer.length > 0) {
            parseData(buffer);
            buffer = '';
        }
    }
    buffer += data;
});



let info = {
    process: {
        total: 0,
        running: 0,
        stopped: 0,
        sleeping: 0 
    },
    cpu: {
        user: 0,
        sys: 0,
        idle: 0
    },
    memory: {
        free: 0,
        total: 0
    }
}

function execReg(str, re, flags){
    let is_global = false;
    let results = [];
    let keys = {};
    let native_re = null;
    let tmpstr = str;

    if(flags === undefined) {
        flags = '';
    }
    const tmpkeys = re.match(/(?!\(\?\P\<)(\w+)(?=\>)/g);
    if (!tmpkeys){
        return str.match(re);
    } else {
        for (let i = 0; i < tmpkeys.length; i++) {
            keys[i] = tmpkeys[i];
        }
    }
    
    native_re = re.replace(/\?\P\<\w+\>/g,'');

    if (flags.indexOf('g') >= 0) {
        is_global = true;
    }
    flags = flags.replace('g','');
    native_re = RegExp(native_re, flags);

    do {
        const tmpmatch = tmpstr.match(native_re);
        let tmpkeymatch = {};
        let tmpsubstr = '';

        if (tmpmatch) {
            tmpsubstr = tmpmatch[0];
            tmpkeymatch[0] = tmpsubstr;
            
            for(let i=1; i < tmpmatch.length; i++) {
                tmpkeymatch[ keys[i-1] ] = tmpmatch[i];
            }

            results.push(tmpkeymatch);
            
            tmpstr = tmpstr.slice( (tmpstr.indexOf(tmpsubstr)+tmpsubstr.length) );

        } else {
            tmpstr = "";
        }
    } while (is_global && tmpstr.length > 0)
    
    return results;
}


function convertBKMG(value, total) {
    switch (os.platform()) {
        case 'darwin':
            const unit = value[value.length - 1];
            const val = value.substr(0, value.length - 1);
            switch (unit) {
                case 'B':
                    return parseFloat(val) / total;
                case 'K':
                    return parseFloat(val) * 1024 / total;
                case 'M':
                    return parseFloat(val) * 1024 * 1024 / total;
                case 'G':
                    return parseFloat(val) * 1024 * 1024 * 1024 / total;
                default:
                    return parseFloat(value) / total;
            }
        case 'linux':
            return parseFloat(value / 100);
    }
}

function parseData(data) {
    if (__flag) return;
    const lines = data.split('\n');

    for (var i = 0; i < 0; i++) {
        console.log(lines[i]);
    }

    const processSummaryResult = execReg(lines[processSummaryIndex], processSummaryRegex)[0];

    info.process = {
        total: parseInt(processSummaryResult.total),
        running: parseInt(processSummaryResult.running),
        stopped: parseInt(processSummaryResult.stopped),
        sleeping: parseInt(processSummaryResult.sleeping)
    };



    const cpuSummaryResult = execReg(lines[cpuSummaryIndex], cpuSummaryRegex)[0];
    if (cpuSummaryResult) {
        info.cpu = {
            user: parseFloat(cpuSummaryResult.user),
            sys: parseFloat(cpuSummaryResult.sys),
            idle: parseFloat(cpuSummaryResult.idle)
        };
    } else {
        return;
    }

    info.memory = {
        free: os.freemem(),
        total: os.totalmem()
    };

    info.list = [];
    for (let i = processStartIndex; i < lines.length - processEndOffset; i++) {
        const line = lines[i];
        const processResult = execReg(line, processRegex)[0];
        if (!processResult) {
            console.log(line)
        }
        info.list.push({
            pid: processResult.pid,
            memory: convertBKMG(processResult.memory, info.memory.total),
            cpu: processResult.cpu,
            command: processResult.command.trim(),
            uptime: processResult.upHour + ':' + 
                    processResult.upMinute + processResult.upUnit +
                    processResult.upSecond
        });
    }
}

module.exports = function() {
    return info;
}