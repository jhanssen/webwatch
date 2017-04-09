/*global process,require,module*/

const Configstore = require("configstore");
const conf = new Configstore("webwatch-urls");

module.exports = argv => {
    const name = argv.name;
    const url = argv.url;
    const selector = argv.selector;
    const force = argv.force;
    if (!name || !url) {
        console.error("needs a name and url");
        return;
    }
    const urls = conf.get("urls") || {};
    if ((name in urls) && !force) {
        console.error("name already exists (use --force to overwrite)");
        return;
    }
    urls[name] = {
        url: url,
        selector: selector
    };
    conf.set("urls", urls);
};
