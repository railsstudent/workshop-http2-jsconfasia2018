# HTTP/2 Workshop at JSConf.Asia 2018

## Who am I?

Sebastiaan Deckers
@sebdeckers on Twitter, GitHub, GitLab
~seb on NPM

Independent hacker, self-funded & unbiased by 3rd party interests o:-)
Passionate about HTTP/2

## What's new in HTTP/2?

- Streams: Interleaved connections
- Frames: Head of line blocking (caveat: HOL at TCP level -> QUIC)
- HPACK: Header compression (currently only per-authority, scary security implications with shared dictionaries)
- Priorities & Dependencies: client can *suggest* relative importance of requests
- Client & Server Settings: Limits on resources and capabilities. E.g. max number of streams, transfer window sizes, etc.
- Server Push: Server initiated, client cancelable
- Coalescing Connections: Serve multiple origin domains over the same TCP socket. SAN/wildcard cert or secondary certificates.

H2 FAQ
https://http2.github.io/faq/

H2 Specs
https://http2.github.io

IETF HTTP Working Group
http://httpwg.org

## Inspecting HTTP/2 Traffic

- Chrome inspector
- `chrome://net-internals/#http2`
- `curl --verbose https://kopijs.org/`
- `nghttp --verbose  https://kopijs.org/`
- `h2url --verbose https://kopijs.org/`

## Exercise: Inspect HTTP/2 Traffic

Install any of these tools and use them to inspect handshake and streams/frames.

## What is HTTP/2 in Node.js?

Based on C library nghttp2. Same library as Apache HTTP Server, Apple Safari, and curl. Bindings in C++ to Node.js internals. Exposed through Core API and Compatibility API.

```js
require('http')  // -> 1.1
require('https') // -> 1.1 over TLS
require('http2') // -> 2.0 with or without TLS
```

Core Node.js modules are automatically exposed in the `node` REPL.

See: https://github.com/nodejs/node

- C deps/nghttp2
- C++ src/node_http2.*
- JS lib/internal/http2/{core,compat}.js
- Docs:
  - Node.js https://nodejs.org/api/http2.html
  - Nghttp2: https://nghttp2.org/documentation/

### Exercise 1: Create an HTTP/2 Server with Node.js

```js
const {createServer} = require('http2')
const server = createServer()
server.on('stream', (stream, headers) => {
  console.log('Request:', headers)
  stream.respond({
    'content-type': 'text/plain; charset=utf-8',
    ':status': 200
  })
  stream.end('Hello World')
})
server.listen(8080)
```

```
curl http://[::]:8080/ --verbose --http2-prior-knowledge
```

Tip: Enable debug mode to log JavaScript binding internals.

```
NODE_DEBUG=http2 node exercises/1.js
```

## Core vs Compatibility API

### Exercise 2: Use the Compatibility API

```js
const {createServer} = require('http2')
const server = createServer((request, response) => {
  console.log('Request:', request.headers)
  response.writeHead(200, {'content-type': 'text/plain; charset=utf-8'})
  response.end('Hello, World!')
})
server.listen(8080)
```

```
nghttp http://[::]:8080/ --verbose
```

## To TLS or not to TLS

Spec allows plaintext or encrypted. Note: It's still just HTTP/2, not HTTPS/2.

HTTP/2 and TLS/1.2 are layered protocols.
Pro: H2 be used over plaintext TCP or over encrypted TLS.
Con: Extra latency due to handshake round trips.

HTTP over QUIC is modular. The initial UDP datagram sets up the TLS/1.3 handshake, establishes the QUIC session, and delivers the HTTP request. Mandating encryption also solves the problem of forward-compatibility, future legacy. E.g. middleboxes making assumptions about plaintext protocols is largely why it took TCP so long (if ever) to deploy at scale features like Explicit Congestion Notification (ECN), FAST_OPEN, etc.

## TLS Extensions

ALPN is used to negotiate between HTTP/1.1 and HTTP/2. Simply falls back to HTTP/1.1 on unsupported clients. Automatically handled using the `allowHTTP1` flag (defaults to `false`).

SNI is used by server to figure out which certificate to use. Essential for CDN edge servers, similar to the HTTP/1.1 `Host` header or the HTTP/2 `:authority` pseudo-header.

OCSP is used to "staple" a fresh (cached) response from the CA to tell the client that the certificate has not been revoked. Otherwise the client must make an additional HTTP request to the CA.

Example: https://gitlab.com/http2/server/blob/master/src/server.js

### Exercise 3a: Generate a localhost TLS certificate

- Use openssl CLI to generate certificate
- Add SAN for `*.localhost` subdomains and/or wildcard (add to `/etc/hosts`)
- ECC P256 & P384 for better performance
- Add to local keychain for developer comfort

See: https://www.npmjs.com/package/tls-keygen

### Exercise 3: Create an HTTP/2 Server with Node.js

```js
const {createSecureServer} = require('http2')
const {readFileSync} = require('fs')
const key = readFileSync('key.pem')
const cert = readFileSync('cert.pem')
const options = {key, cert, allowHTTP1: true}
const server = createSecureServer(options, (request, response) => {
  console.log(`Client request using HTTP/${request.httpVersion}`)
  response.writeHead(200, {'content-type': 'application/json'})
  response.end(JSON.stringify({hello: 'world'}))
})
server.listen(8443)
```

```
curl https://localhost:8443/ --verbose --insecure ; echo
```

Now try it in the browser! (Should work... YMMV)

## Frameworks

- Connect works
- Express WIP
- Fastify works

Fastify is a new server-side framework that supports HTTP/2 very well. Great fit for modern async/await-style code. Highly extensible with already 50+ plugins available. Crazy high performance of JSON output: faster than `JSON.stringify`. Built-in low overhead logging with Pino. Backwards compatible with Express middlewares. Use it!

### Exercise 4: Try Fastify

```js
const {readFileSync} = require('fs')

const fastify = require('fastify')({
  logger: true,
  http2: true,
  https: {
    allowHTTP1: true,
    key: readFileSync('key.pem'),
    cert: readFileSync('cert.pem')
  }
})

fastify.get('/:path', function (request, reply) {
  reply.code(200).send({hello: 'world', path: request.params.path})
})

fastify.get('/foobar', async (request, reply) => {
  return {foo: 'bar'}
})

fastify.get('/explode', async (request, reply) => {
  throw new Error('KABOOM!')
})

fastify.route({
  method: 'GET',
  url: '/about',
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          node: {type: 'string'},
          v8: {type: 'string'}
        }
      }
    }
  },
  handler: async (request, reply) => {
    return process.versions
  }
})

fastify.listen(8443).catch((error) => {
  fastify.log.error(error)
  process.exit(1)
})
```

## Load Test

Quick and dirty load testing. Useful for finding memory leaks, DoS attacks, other fun stuff. Note: Server Push is disabled.

```
h2load https://localhost:8443/ -c 10 -n 1000 -t 4 --verbose
```

## Coalescing Connections

A server can use the `ORIGIN` frame to declare that it can serve multiple authorities (domains). A client makes use of this if two conditions are met:

1. Their DNS resolves to the same IP. Or more precisely, all domains have a non-zero intersection of resolved IPs.
1. The TLS certificate used lists each of the domains.

In the future the DNS lookup may be omitted, and secondary certificates may be supplied after the initial TLS handshake is established. (Note: Interesting use-cases like improved privacy.)

### Exercise 5: Coalesce Multiple Domains

```js
WIP
```

## Server Push

Server sends a "fake" request to the client in a `PUSH_PROMISE` frame. Client can simply wait, tracking the request and its promised stream ID in a *push cache*. Or the client can `RESET` the stream to cancel the response.

To fulfill the promised stream, the server sends a "fake" response to the client. This consists of the response `HEADERS` and `DATA` frames.

The `HEADERS` and `PUSH_PROMISE` frames are very similar. Both contain a *Header Block Fragment* with the compressed HTTP headers.

Server Push solves the "think time" problem of servers wasting round trips on any undiscovered dependencies between requests.

### Exercise 6: Push Web App Dependencies

Note: HTTP/2 remote settings are used by the server to check whether the client allows server push. Sending a `PUSH_PROMISE` frame otherwise would be treated by the client as a connection error.

```js
const {createSecureServer} = require('http2')
const {readFileSync} = require('fs')
const key = readFileSync('key.pem')
const cert = readFileSync('cert.pem')
const options = {key, cert}

const html = `<script src='/entry.js' type='module' crossorigin='use-credentials'></script><h1>🤩</h1>`
const entry = `import '/dep.js'`
const dep = `console.log('Hello, World!')`

const server = createSecureServer(options, (request, response) => {
  console.log(`Client requests ${request.headers[':path']} ` +
    `using HTTP/${request.httpVersion}`)
  if (
    request.httpVersionMajor === 2 &&
    request.stream.session.remoteSettings.enablePush === true
  ) {
    response.stream.pushStream({':path': '/dep.js'}, (error, pushStream) => {
      pushStream.respond({'content-type': 'application/javascript'})
      pushStream.end(dep)
    })
    response.stream.pushStream({':path': '/entry.js'}, (error, pushStream) => {
      pushStream.respond({'content-type': 'application/javascript'})
      pushStream.end(entry)
    })
  }
  response.writeHead(200, {'content-type': 'text/html; charset=utf-8'})
  response.end(html)
})
server.listen(8443)
```

## Real-World Server Push Problems

### CDN Support: Downstream vs Upstream

Many CDNs are built on Nginx, Varnish, Apache Traffic Server (ATS), Apache HTTP Server (httpd), H2O, etc. While these all support HTTP/2 on the client connection, they typically still use HTTP/1.1 on the origin connection.

Most support Server Push through the HTTP/1.1 `Link` header. Limited in number of push responses. Considered hints/suggestions; not explicit instructions. Only fulfilled if the edge cache has the asset in its cache. Goal is to fill server "think time" after the first round-trip, not to be a full-blown asset bundling solution.

```
Link: </style.css>; rel=preload;
```

### Over-Sending: Cache Digest

One fundamental problem with Server Push is that the server is unaware of the cache state of the client. This is addressed by the Cache Digest proposal. The client sends the server a list of its cache contents. This uses a bloom filter or cuckoo filter, probabilistic and space-efficient data structures.

https://github.com/httpwg/http-extensions#cache-digest

An experimental implementation of cache-digests using a service worker. Combined with `cache-control: immutable` and a cache busting strategy (e.g. file revving) this eliminates virtually *all* redundant server pushes. Eventually this may be implemented natively in browsers.

https://www.npmjs.com/package/cache-digest-immutable

### Knowing What To Send

- Manifest: Pre-computed dependency tree. Generated manually and/or through build tools to trace imports and references.
- Tracking: Server tracks follow-up requests and models a dependency tree at runtime. 🤫 https://github.com/google/node-h2-auto-push

## Introducing: @http2/server

Created to use server push and cache digests to eliminate round trips.

```
npm i @http2/server
./node_modules/.bin/http2server --help
```

### Exercise 6: Create Push Manifest

Spec Tests:
https://gitlab.com/http2/configuration/blob/master/test/manifest-valid.js

Examples:
- https://github.com/KopiJS/kopijs.org/blob/master/http2live.conf.production.js
- https://github.com/serrynaimo/2018.jsconf.asia/blob/site/http2server.manifest.js
- https://gitlab.com/http2/website/blob/master/environments/base.js

public/index.html
```html
<script src='/entry.js' type='module' crossorigin='use-credentials'></script>
<h1>🦖</h1>
```

public/entry.js
```js
import '/dep.js'
```

public/dep.js
```js
console.log('Hello, World!')
```

options.js
```js
module.exports = () => ({
  hosts: [
    {
      domain: 'localhost',
      root: './public',
      manifest: [
        // Shorthand:
        // {'/index.html': '**/*.js'}

        // Recursive:
        // {'/index.html': 'entry.js'},
        // {'/entry.js': 'dep.js'}

        // Excludes:
        // {'/index.html': ['entry.js', '!**/*.map']}
      ]
    }
  ]
})
```

```
./node_modules/.bin/http2server start --config exercises/options.js 
```

## Introducing: @http2/live

https://http2.live/

Static hosting SaaS with server push. Free and open source. Experimental prototype, mind the bugs.

### Example: Front End Development with HTTP/2 Server Push

https://gitlab.com/http2/website

- Zero wasted round trips
- Hardly any build tools
- No polyfills
- No frameworks, just standards
- Web components: custom elements, shadow DOM, HTML templates
