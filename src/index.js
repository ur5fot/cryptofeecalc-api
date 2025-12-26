const app = require('./app')
const { port } = require('./config/env')

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
