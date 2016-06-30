# orangechat webapp

It's a chat for subreddits.


### Embedding into reddit.com

The main place this will be used it emebedded into https://reddit.com. This means:
* The widget must be initialised with the DOM fully created as quickly as possible for when users click between pages.
* All HTTP requests and assets must be done over HTTPS.
* CSS styles must be prefixed as not to clash with existing styles.
* Any libraries and frameworks in use on reddit.com may be re-used to our advantage.
* All requests to our own servers must be fully CORS capable

### Tools, libraries and frameworks

* mithril.js framework for it's low footprint and performance
* SockJS websocket library

Already in use on reddit.com that we may re-use:
* jQuery
* Underscore (not lodash!)
* Backbone
* Jed

Need events? Backbone.Events

### Development

This repo comes with a local development server that may be used to test out the frontend during development.

Usage: `npm start` or `PORT=8080 npm start` to specify the port.

The frontend still communicates to app.orangechat.io production services so to make things easier we have whitelisted common
development hostnames. You may access the development server at either `127.0.0.1` or any hostname ending in `.local` if you add it to your hosts file.

To build your changes, run `npm run build`.

### License

Copyright (c) 2016 Darren Whitlen & orangechat.io Licensed under the Apache License.
