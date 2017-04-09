# webwatch
Watch webpages for changes.

```
npm install -g webwatch
```

Uses [Cheerio](https://github.com/cheeriojs/cheerio) to parse HTML and [jsdiff](https://github.com/kpdecker/jsdiff) to generate diffs.

Supported notification mechanisms
* [Pushover](https://pushover.net/) using [pushover-notifications](https://github.com/qbit/node-pushover)

# usage

#### adding url
```
webwatch --add --url=http://www.google.com --name=Google --selector="#viewport"
```

#### removing url
```
webwatch --remove --name=Google
```

#### running detection
```
webwatch
```

#### configuring pushover
```
webwatch --cfg --notification=pushover --app=<app key> --user=<user key>
```
