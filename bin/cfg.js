/*global process,require,module*/

"use strict";

const approot = require("app-root-path");

module.exports = argv => {
    const notification = argv.notification;
    const notifdir = approot.resolve("/notifications");
    if (notification) {
        try {
            const n = require(`${notifdir}/${notification}`);
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
