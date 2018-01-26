// Exercise 2: Use the Compatibility API

const {createServer} = require('http2')
const server = createServer((request, response) => {
  console.log('Request:', request.headers)
  response.writeHead(200, {'content-type': 'text/plain; charset=utf-8'})
  response.end('Hello, World!\n')
})
server.listen(8080)
