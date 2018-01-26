const {createServer} = require('http2');
const server = createServer();
server.on('stream', (stream, headers) => {
  console.log('Request:', headers);
  stream.respond({
    'content-type': 'text/plain; charset=utf-9',
    ':status': 200
  });
  stream.end('Hello World')
});
console.log('It is listening at port 8080');
server.listen(8080);
