/*global process,require,module*/

"use strict";

const request = require("request-promise-native");
const cheerio = require("cheerio");
const promisify = require("es6-promisify");
const jsdiff = require("diff");
const approot = require("app-root-path");
const fs = require("fs");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const Configstore = require("configstore");
const confurls = new Configstore("webwatch-urls");
const confpages = new Configstore("webwatch-pages");
const Horseman = require('node-horseman');

const cache = {
    _cache: {},
    get: function(url, phantom) {
        const key = url + (phantom ? "-phantom" : "");
        return new Promise((resolve, reject) => {
            if (key in cache._cache) {
                resolve(cheerio.load(cache._cache[key]));
                return;
            }
            if (phantom) {
                const horseman = new Horseman();
                horseman
                    .open(url)
                    .html()
                    .then(body => {
                        cache._cache[key] = body; resolve(cheerio.load(body));
                        return horseman.close();
                    });
            } else {
                request({ uri: url })
                    .then(body => {
                        cache._cache[key] = body; resolve(cheerio.load(body));
                    })
                    .catch(err => { reject(err); });
            }
        });
    }
};

function notify(title, body, data)
{
    return new Promise((resolve, reject) => {
        let total, remaining, rejections = 0;
        const runNotify = (notif) => {
            try {
                const n = require(notif);
                n.notify(title, body, data)
                    .then(() => {
                        if (!--remaining)
                            resolve();
                    }).catch(err => {
                        //console.error(err);
                        ++rejections;
                        if (!--remaining) {
                            if (rejections == total)
                                console.error("all notifications rejected. at least one needs to be configured.");
                            resolve();
                        }
                    });
            } catch (err) {
                console.error("failed to run notification", err);
                ++rejections;
                if (!--remaining) {
                    if (rejections == total)
                        console.error("all notifications rejected. at least one needs to be configured.");
                    resolve();
                }
            }
        };

        const notifdir = approot.resolve("/notifications");
        readdir(notifdir).then(files => {
            let promises = [];
            for (let idx = 0; idx < files.length; ++idx) {
                promises.push(stat(`${notifdir}/${files[idx]}`));
            }
            Promise.all(promises).then(stats => {
                let torun = [];
                for (let idx = 0; idx < files.length; ++idx) {
                    if (stats[idx].isDirectory() || (stats[idx].isFile() && files[idx].substr(-3) == ".js")) {
                        torun.push(`${notifdir}/${files[idx]}`);
                    }
                }
                if (!torun.length) {
                    resolve();
                } else {
                    total = remaining = torun.length;
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

function compare(name, url, html, cfg)
{
    return new Promise((resolve, reject) => {
        if (!html.length) {
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
        cache.get(url.url, url.phantom).then($ => {
            let selected, html = "";
            if (url.selector) {
                if (typeof url.selector === "string") {
                    selected = $(url.selector);
                } else if (url.selector instanceof Array) {
                    selected = $(...url.selector);
                } else {
                    console.error("invalid selector");
                }
            }
            if (selected) {
                selected.each((i, elem) => {
                    html += $(elem).html();
                });
            } else {
                html = $.html();
            }
            compare(name, url, html, cfg)
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
