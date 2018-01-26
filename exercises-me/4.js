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
          v8: {type: 'string'},
          nghttp2: { type: 'string' }
        }
      }
    }
  },
  handler: async (request, reply) => {
    console.log(process.versions)
    return process.versions
  }
})

fastify.listen(8443).catch((error) => {
  fastify.log.error(error)
  process.exit(1)
})
