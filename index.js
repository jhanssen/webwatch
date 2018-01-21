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
    console.log("    --phantom (optional): process html in phantomjs before querying selectors");
    console.log("    --delay=value (optional): allow page to settle before processing html");
    console.log("  --remove: remove a url");
    console.log("    --name=value (required): name to remove");
    console.log("  --show: show watched urls");
    console.log("    --name=value (optional): name to show");
    console.log("  --cfg: configure webwatch");
    console.log("    --notification=value: configure notification");
}

const handlers = {
    // cfg should be first since other options (such as --show and --remove)
    // might be interpreted as options to --cfg
    cfg: () => require("./bin/cfg"),
    add: () => require("./bin/add"),
    remove: () => require("./bin/remove"),
    show: () => require("./bin/show")
};

if (argv.help) {
    syntax();
} else {
    let ran = false;
    for (let k in handlers) {
        if (k in argv) {
            handlers[k]()(argv);
            ran = true;
            break;
        }
    }
    if (!ran) {
        require("./bin/run")(argv);
    }
}
