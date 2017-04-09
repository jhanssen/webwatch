/*global process,require,module*/

"use strict";

module.exports = argv => {
    const notification = argv.notification;
    if (notification) {
        try {
            const n = require(`../notification/${notification}`);
            if (n)
                n.cfg(argv);
        } catch (e) {
            console.error("couldn't find notification");
        }
        return;
    }
};
