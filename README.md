# orangechat webapp

It's a chat for subreddits.

### Status
The project has been morphing around into different things until it has settled into its current state. It is now currently being tidied up and documented so that other developers can understand how everything is put together.

This is only the frontend to orangechat that you may run locally to contribute to the project.

### Embedding into reddit.com

The main place this will be used it emebedded into https://reddit.com. This means:
* The widget must be initialised with the DOM fully created as quickly as possible for when users click between pages.
* All HTTP requests and assets must be done over HTTPS.
* CSS styles must be prefixed as not to clash with existing styles.
* Any libraries and frameworks in use on reddit.com may be re-used to our advantage.
* All requests to our own servers must be fully CORS capable

### Tools, libraries and frameworks

* mithril.js framework for it's low footprint (with MSX for views)
* SockJS websocket library

Already in use on reddit.com that we may re-use:
* jQuery
* Underscore (not lodash!)
* Backbone
* Jed

Need events? Backbone.Events

### Development

This repository comes with a local development server that may be used to test out the frontend during development.

Usage: `npm start` or `PORT=8080 npm start` to specify the port.

The frontend communicates to app.orangechat.io production services using CORS, so to make things easier we have whitelisted common
development hostnames. You may access the development server at either `127.0.0.1` or any hostname ending in `.local` if you add it to your hosts file. Both HTTP/HTTPS and any port are supported.

To build your changes, run `npm run build`.

### License

Copyright (c) 2016 Darren Whitlen & orangechat.io Licensed under the Apache License.
