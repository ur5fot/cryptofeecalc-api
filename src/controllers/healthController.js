const getHealth = (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
}

module.exports = { getHealth }
