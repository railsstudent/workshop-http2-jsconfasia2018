// Exercise 5: Coalesce Multiple Domains

const {createSecureServer} = require('http2')
const {readFileSync} = require('fs')
const key = readFileSync('key.pem')
const cert = readFileSync('cert.pem')
const options = {key, cert}

const html = `<script src='/entry.js' type='module' crossorigin='use-credentials'></script><h1>🤩</h1>`
const entry = `import 'https://foo.localhost/dep.js'`
const dep = `console.log('Hello, World!')`

const server = createSecureServer(options)
server.on('session', (session) => {
  console.log('session!')
  session.altsvc('h2="foo.localhost:8443"', 'https://foo.localhost:8443')
  session.on('stream', (stream) => {
    stream.end(html)
  })
})
server.listen(8443)
