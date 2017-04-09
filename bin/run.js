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
            if (url in cache._cache) {
                resolve(cheerio.load(cache._cache[url]));
                return;
            }
            request({ uri: url })
                .then(body => { cache._cache[url] = body; resolve(cheerio.load(body)); })
                .catch(err => { reject(err); });
        });
    }
};

function notify(title, body, data)
{
    return new Promise((resolve, reject) => {
        let remaining = 0;
        const runNotify = (notif) => {
            try {
                const n = require(notif);
                n.notify(title, body, data)
                    .then(() => {
                        if (!--remaining)
                            resolve();
                    }).catch(err => {
                        console.error(err);
                        if (!--remaining)
                            resolve();
                    });
            } catch (err) {
                console.error("failed to run notification", err);
                if (!--remaining)
                    resolve();
            }
        };

        readdir("notifications").then(files => {
            let promises = [];
            for (let idx = 0; idx < files.length; ++idx) {
                promises.push(stat(`notifications/${files[idx]}`));
            }
            Promise.all(promises).then(stats => {
                let torun = [];
                for (let idx = 0; idx < files.length; ++idx) {
                    if (stats[idx].isDirectory() || (stats[idx].isFile() && files[idx].substr(-3) == ".js")) {
                        torun.push(`../notifications/${files[idx]}`);
                    }
                }
                remaining = torun.length;
                if (!torun) {
                    resolve();
                } else {
                    for (let idx = 0; idx < torun.length; ++idx) {
                        runNotify(torun[idx]);
                    }
                }
            }).catch(err => {
                console.error("failed to stat notifications", err);
                reject();
            });
        }).catch(err => {
            console.error("failed to read notifications", err);
            reject();
        });
    });
}

function compare(name, url, $, cfg)
{
    return new Promise((resolve, reject) => {
        const html = ($ && $.html()) || null;
        if (!html) {
            if (cfg.verbose)
                console.error("no data");
            notify("error", `no data for ${name}`).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
            return;
        }
        const page = confpages.get(name);
        if (!page) {
            // assume not set yet
            if (cfg.verbose) {
                console.log("page doesn't exist, saving...");
            }
            confpages.set(name, html);
            resolve();
        } else {
            if (cfg.verbose) {
                console.log("html", html);
                console.log("previous", page);
            }
            let notified = false;
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
                if (changed)
                    confpages.set(name, html);
                notify(`${name} changed`, `${name} has changed: ${url.url}\n` + ret, { cfg: cfg, url: url }).then(() => {
                    resolve();
                }).catch(err => {
                    reject(err);
                });
                return;
            } else if (cfg.verbose) {
                console.log("no changes");
            }
            resolve();
        }
    });
}

function run(name, url, cfg) {
    return new Promise((resolve, reject) => {
        cache.get(url.url).then($ => {
            if (url.selector) {
                if (typeof url.selector === "string") {
                    $ = $(url.selector);
                } else if (url.selector instanceof Array) {
                    $ = $(...url.selector);
                } else {
                    console.error("invalid selector");
                }
            }
            compare(name, url, $, cfg)
                .then(() => {
                    resolve();
                }).catch(() => {
                    reject();
                });
        }).catch((err) => {
            notify("error", err.message).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
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
