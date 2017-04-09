/*global process,require,module*/

"use strict";

const Configstore = require("configstore");
const conf = new Configstore("webwatch-cfg");

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
    conf.set("notifications", notifs);
}

function notify(title, body)
{
    console.log("pushover", title, body);
}

module.exports = {
    cfg: configure,
    notify: notify
};
