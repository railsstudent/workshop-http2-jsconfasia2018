// Exercise 1: Create an HTTP/2 Server with Node.js

const {createServer} = require('http2')
const server = createServer()
server.on('stream', (stream, headers) => {
  console.log('Request:', headers)
  stream.respond({
    'content-type': 'text/plain; charset=utf-8',
    ':status': 200
  })
  stream.end('Hello, World!\n')
})
server.listen(8080, () => console.dir(server.address()))
