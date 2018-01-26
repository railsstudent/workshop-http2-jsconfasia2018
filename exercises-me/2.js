const {createServer} = require('http2');
const server = createServer((request, response) => {
  console.log('Request:', request.headers)
  response.writeHead(200, {'content-type': 'text/plain; charset=utf-8'})
  response.end('Hello, World! I am attending http2 workshop.')
});
console.log('It is listening at port 8080');
server.listen(8080);
