/*global process,require,module*/

"use strict";

const request = require("request-promise-native");
const cheerio = require("cheerio");
const promisify = require("es6-promisify");
const fs = require("fs");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const Configstore = require("configstore");
const confurls = new Configstore("webwatch-urls");
const confcfg = new Configstore("webwatch-cfg");
const confpages = new Configstore("webwatch-pages");

function notify(title, body)
{
    const runNotify = notif => {
        try {
            const n = require(notif);
            n.notify(title, body);
        } catch (err) {
            console.log("failed to run notification", err);
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
    if (!$) {
        console.error("no data");
        notify("error", `no data for ${name}`);
        return;
    }
    const page = confpages.get(name);
    const html = $.html();
    if (!page) {
        // assume not set yet
        confpages.set(name, html);
    } else {
        console.log("html", html);
        const diff = page != html;
        if (diff || cfg.notify) {
            notify(`${name} changed`, `${name} has changed: ${url.url}`);
            if (diff)
                confpages.set(name, html);
        }
    }
}

function run(name, url, cfg) {
    request({ uri: url.url, transform: ((html) => { return cheerio.load(html); }) }).then($ => {
        if (url.selector) {
            $ = $(url.selector);
        }
        compare(name, url, $, cfg);
    }).catch((err) => {
        notify("error", err.message);
    });
}

function makeCfg(argv) {
    let cfg = {};
    if (argv.notify) {
        cfg.notify = true;
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
        for (let k in urls) {
            run(k, urls[k], cfg);
        }
    }
};
