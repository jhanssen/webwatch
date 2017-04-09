/*global process,require,module*/

const Configstore = require("configstore");
const conf = new Configstore("webwatch-urls");

module.exports = argv => {
    const urls = conf.get("urls") || {};
    const name = argv.name;
    if (!name) {
        for (let n in urls) {
            console.log(`name: ${n}`);
        }
    } else {
        if (name in urls) {
            const item = urls[name];
            console.log(`name: ${name}`);
            console.log(`url: ${item.url}`);
            if (item.selector)
                console.log(`selector: ${item.selector}`);
        } else {
            console.error(`no such name: ${name}`);
        }
    }
};
