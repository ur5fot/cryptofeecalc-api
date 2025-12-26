const express = require('express')
const estimateRoutes = require('./estimate')

const router = express.Router()

router.use('/estimate', estimateRoutes)

module.exports = router
