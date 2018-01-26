const {createSecureServer} = require('http2')
const {readFileSync} = require('fs')
const key = readFileSync('key.pem')
const cert = readFileSync('cert.pem')
const options = {key, cert}

const html = `<script src='/entry.js' type='module' crossorigin='use-credentials'></script><h1>⚛️</h1>`
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
