/*global process,require,module*/

"use strict";

module.exports = argv => {
    const notification = argv.notification;
    if (notification) {
        try {
            const n = require(`../notifications/${notification}`);
            if (n) {
                n.cfg(argv);
            } else {
                console.error(`failed to configure notification ${notification}`);
            }
        } catch (e) {
            console.error("couldn't find notification");
        }
        return;
    }
};
