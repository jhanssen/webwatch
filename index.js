#!/usr/bin/env node

/*global process,require*/

"use strict";

const minimist = require("minimist");
const argv = minimist(process.argv.slice(2));

function syntax()
{
    console.log("webwatch [--add|--remove|--show|--cfg]");
    console.log("  --add: adds a url to watch");
    console.log("    --url=value (required): url to watch");
    console.log("    --name=value (required): name to register as");
    console.log("    --selector=value (optional): css selector to watch");
    console.log("  --remove: remove a url");
    console.log("    --name=value (required): name to remove");
    console.log("  --show: show watched urls");
    console.log("    --name=value (optional): name to show");
    console.log("  --cfg: configure webwatch");
    console.log("    --notification=value: configure notification");
}

const handlers = {
    add: require("./bin/add"),
    show: require("./bin/show"),
    remove: require("./bin/remove"),
    cfg: require("./bin/cfg")
};

if (argv.help) {
    syntax();
} else {
    let ran = false;
    for (let k in handlers) {
        if (k in argv) {
            handlers[k](argv);
            break;
        }
    }
    if (!ran) {
        require("./bin/run")(argv);
    }
}
