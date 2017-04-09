/*global process,require,module*/

"use strict";

const Configstore = require("configstore");
const conf = new Configstore("webwatch-cfg");
const Push = require("pushover-notifications");

function log(pushover)
{
    console.log("notification: pushover");
    console.log(`  app: ${pushover.app}`);
    console.log(`  user: ${pushover.user}`);
    console.log(`  enabled: ${pushover.enabled}`);
}

function configure(argv)
{
    const notifs = conf.get("notifications") || {};
    if (argv.show) {
        if (notifs.pushover) {
            log(notifs.pushover);
        } else {
            console.log("no pushover config");
        }
        return;
    }
    if (argv.remove) {
        if (!notifs.pushover) {
            console.log("no pushover config");
            return;
        }
        delete notifs.pushover;
        conf.set("notifications", notifs);
        console.log("pushover removed");
        return;
    }
    const app = argv.app;
    const user = argv.user;
    const enable = argv.enable || !argv.disable;
    if (!app || !user) {
        if ((argv.enable || argv.disable) && notifs.pushover) {
            notifs.pushover.enabled = enable;
            console.log("pushover", enable ? "enabled" : "disabled");
            conf.set("notifications", notifs);
            return;
        }

        console.error("needs app and user keys");
        return;
    }
    notifs.pushover = {
        app: app,
        user: user,
        enabled: enable
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
            return;
        }
        if (!notifs.pushover.enabled) {
            reject("pushover is not enabled");
            return;
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
