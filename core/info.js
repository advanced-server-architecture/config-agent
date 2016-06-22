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
        console.log(`${cache.length} reports restored`);
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
            this.report('machine', sys());
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