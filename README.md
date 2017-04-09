# webwatch
Watch webpages for changes.

```
npm install -g webwatch
```

Uses [Cheerio](https://github.com/cheeriojs/cheerio) to parse HTML and [jsdiff](https://github.com/kpdecker/jsdiff) to generate diffs.

Supported notification mechanisms
* [Pushover](https://pushover.net/) using [pushover-notifications](https://github.com/qbit/node-pushover)

### usage

#### adding url
```
webwatch --add --url=http://www.google.com --name=Google --selector="#viewport"
```

#### removing url
```
webwatch --remove --name=Google
```

#### configuring pushover
```
webwatch --cfg --notification=pushover --app=<app key> --user=<user key>
```

#### running detection
```
webwatch
```

#### scheduling
use your operating scheduling mechanism, such as ```crontab``` on unix-like systems.
