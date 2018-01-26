module.exports = {
  hosts: [
    {
      domain: 'localhost',
      root: './public',
      manifest: [
        // Server Push rule
        {get: '/index.html', push: '**/*.js'}

        // Recursive:
        // {get: '/index.html', push: '/entry.js'},
        // {get: '/entry.js', push: '/dep.js'}

        // Exclude files:
        // {get: '/index.html', push: ['/*.js', '!**/*.map']}
      ]
    }
  ]
}
