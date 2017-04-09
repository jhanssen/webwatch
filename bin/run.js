/*global process,require,module*/

"use strict";

const request = require("request-promise-native");
const cheerio = require("cheerio");
const promisify = require("es6-promisify");
const jsdiff = require("diff");
const fs = require("fs");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const Configstore = require("configstore");
const confurls = new Configstore("webwatch-urls");
const confpages = new Configstore("webwatch-pages");

const cache = {
    _cache: {},
    get: function(url) {
        return new Promise((resolve, reject) => {
            if (url.url in cache._cache) {
                resolve(cheerio.load(cache._cache[url.url]));
                return;
            }
            request({ uri: url.url })
                .then(body => { cache._cache[url.url] = body; resolve(cheerio.load(body)); })
                .catch(err => { reject(err); });
        });
    }
};

function notify(title, body, data)
{
    const runNotify = notif => {
        try {
            const n = require(notif);
            n.notify(title, body, data).then(() => {}).catch(err => { console.error(err); });
        } catch (err) {
            console.error("failed to run notification", err);
        }
    };

    readdir("notifications").then(files => {
        let promises = [];
        for (let idx = 0; idx < files.length; ++idx) {
            promises.push(stat(`notifications/${files[idx]}`));
        }
        Promise.all(promises).then(stats => {
            for (let idx = 0; idx < files.length; ++idx) {
                if (stats[idx].isDirectory() || (stats[idx].isFile() && files[idx].substr(-3) == ".js")) {
                    runNotify(`../notifications/${files[idx]}`);
                }
            }
        }).catch(err => {
            console.error("failed to stat notifications", err);
        });
    }).catch(err => {
        console.error("failed to read notifications", err);
    });
}

function compare(name, url, $, cfg)
{
    const html = ($ && $.html()) || null;
    if (!html) {
        if (cfg.verbose)
            console.error("no data");
        notify("error", `no data for ${name}`);
        return;
    }
    const page = confpages.get(name);
    if (!page) {
        // assume not set yet
        if (cfg.verbose) {
            console.log("page doesn't exist, saving...");
        }
        confpages.set(name, html);
    } else {
        if (cfg.verbose) {
            console.log("html", html);
            console.log("previous", page);
        }
        const changed = page != html;
        if (changed || cfg.notify) {
            const diff = jsdiff.diffLines(page, html);
            let ret = "";
            for (let idx = 0; idx < diff.length; ++idx) {
                const d = diff[idx];
                if (d.added)
                    ret += "+ " + d.value;
                else if (d.removed)
                    ret += "- " + d.value;
            }
            if (cfg.verbose) {
                console.log("changed:");
                console.log(ret);
            }
            notify(`${name} changed`, `${name} has changed: ${url.url}\n` + ret, { cfg: cfg, url: url });
            if (changed)
                confpages.set(name, html);
        } else if (cfg.verbose) {
            console.log("no changes");
        }
    }
}

function run(name, url, cfg) {
    return new Promise((resolve, reject) => {
        cache.get(url).then($ => {
            if (url.selector) {
                if (typeof url.selector === "string") {
                    $ = $(url.selector);
                } else if (url.selector instanceof Array) {
                    $ = $(...url.selector);
                } else {
                    console.error("invalid selector");
                }
            }
            compare(name, url, $, cfg);
            resolve();
        }).catch((err) => {
            notify("error", err.message);
            reject(err);
        });
    });
}

function makeCfg(argv) {
    let cfg = {};
    if (argv.notify) {
        cfg.notify = true;
    }
    if (argv.verbose) {
        cfg.verbose = true;
    }
    return cfg;
}

module.exports = argv => {
    const urls = confurls.get("urls") || {};
    const name = argv.name;
    const cfg = makeCfg(argv);
    if (name) {
        if (name in urls) {
            run(name, urls[name], cfg);
        } else {
            console.error("no such url");
        }
    } else {
        let idx = 0;
        const keys = Object.keys(urls);
        const runNext = () => {
            if (idx >= keys.length)
                return;
            const key = keys[idx];
            ++idx;
            run(key, urls[key], cfg)
                .then(() => { runNext(); })
                .catch(() => { runNext(); });
        };
        runNext();
    }
};
