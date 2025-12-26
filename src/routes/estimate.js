const express = require('express')
const { estimateFee } = require('../controllers/estimateController')

const router = express.Router()

router.post('/', estimateFee)

module.exports = router
