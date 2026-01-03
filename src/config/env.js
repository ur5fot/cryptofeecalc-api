const dotenv = require('dotenv')

dotenv.config()

module.exports = {
  port: process.env.PORT || 4000,
  env: process.env.NODE_ENV || 'development',
  tronGridEndpoint: process.env.TRON_GRID_ENDPOINT || 'https://api.trongrid.io', // mainnet
  // tronGridEndpoint: process.env.TRON_GRID_ENDPOINT || 'https://nile.trongrid.io', // testnet Nile
  tronGridApiKey: process.env.TRON_GRID_API_KEY || 'cb71f17f-cb0b-4af4-b1c9-a547276dbf18', // demo key
  privateKey: process.env.PRIVATE_KEY || '01', // demo key
}
