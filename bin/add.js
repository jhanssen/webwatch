/*global process,require,module*/

"use strict";

const Configstore = require("configstore");
const conf = new Configstore("webwatch-urls");

module.exports = argv => {
    const name = argv.name;
    const url = argv.url;
    const selector = argv.selector;
    const delay = argv.delay;
    const phantom = ("phantom" in argv);
    const force = argv.force;
    if (delay && !phantom) {
        console.error("delay only supported when using --phantom");
        return;
    }
    if (!name || !url) {
        console.error("needs a name and url");
        return;
    }
    const urls = conf.get("urls") || {};
    if ((name in urls) && !force) {
        console.error("name already exists (use --force to overwrite)");
        return;
    }
    let sel;
    if (selector) {
        try {
            sel = JSON.parse(selector);
        } catch (e) {
            if (e instanceof SyntaxError && typeof selector === "string")
                sel = selector;
        }
    }
    urls[name] = {
        url: url,
        selector: sel,
        phantom: phantom,
        delay: delay
    };
    console.log(`added ${name}`);
    conf.set("urls", urls);
};
