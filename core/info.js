'use strict';

const sys = require('util/sys');

let id;
let cb;
let inited = false;

let cache = [];

module.exports = {
    install(c) {
        cb = c;
        inited = true;
        for (const c of cache) {
            cb(c.type, c.info);
        }
        cache = [];
    },
    uninstall() {
        cb = null;
        inited = false;
    },
    updateInfo(delay) {
        if (id) {
            clearInterval(id);
        }
        id = setInterval(() => {
            cb('machine', sys());
        }, delay)
    },
    report(type, info) {
        if (!inited) {
            cache.push({
                type,
                info
            });
        } else {
            cb(type, info);
        }
    }
}