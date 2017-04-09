/*global process,require,module*/

"use strict";

const Configstore = require("configstore");
const conf = new Configstore("webwatch-cfg");
const Push = require("pushover-notifications");

function configure(argv)
{
    const app = argv.app;
    const user = argv.user;
    if (!app || !user) {
        console.error("needs app and user keys");
        return;
    }
    const notifs = conf.get("notifications") || {};
    notifs.pushover = {
        app: app,
        user: user
    };
    console.log("pushover configured");
    conf.set("notifications", notifs);
}

function notify(title, body, data)
{
    return new Promise((resolve, reject) => {
        const notifs = conf.get("notifications") || {};
        if (!notifs.pushover) {
            reject("needs a pushover config");
        }
        const app = notifs.pushover.app;
        const user = notifs.pushover.user;
        if (!app || !user) {
            reject("needs app and user keys");
            return;
        }
        const verbose = (data && data.cfg && data.cfg.verbose) || false;
        const url = (data && data.url) || undefined;
        let msg = {
            message: body,
            title: title
        };
        if (url) {
            msg.url = url.url;
        }
        let p = new Push({
            user: user,
            token: app
        });
        p.send(msg, (err, result) => {
            if (err) {
                if (verbose)
                    console.log("pushover error", err);
                reject(err);
                return;
            }
            if (verbose)
                console.log("pushover ok", result);
            resolve();
        });
    });
}

module.exports = {
    cfg: configure,
    notify: notify
};
