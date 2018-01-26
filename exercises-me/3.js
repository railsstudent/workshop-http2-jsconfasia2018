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
