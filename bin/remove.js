/*global process,require,module*/

"use strict";

const Configstore = require("configstore");
const conf = new Configstore("webwatch-urls");

module.exports = argv => {
    const name = argv.name;
    if (!name) {
        console.error("needs a name and url");
        return;
    }
    const urls = conf.get("urls") || {};
    if (!(name in urls)) {
        console.error("name doesn't exist");
        return;
    }
    delete urls[name];
    console.log(`removed ${name}`);
    conf.set("urls", urls);
};
