const express = require('express')
const { getHealth } = require('./controllers/healthController')
const apiRoutes = require('./routes')
const { notFound } = require('./middlewares/notFound')
const { errorHandler } = require('./middlewares/errorHandler')

const app = express()

app.use(express.json())

app.get('/health', getHealth)
app.use('/api', apiRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
