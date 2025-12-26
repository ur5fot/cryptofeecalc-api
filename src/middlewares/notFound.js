const notFound = (req, res, next) => {
  res.status(404).json({
    status: 'not_found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  })
}

module.exports = { notFound }
