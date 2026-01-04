const dotenv = require('dotenv')

dotenv.config()

module.exports = {
  port: process.env.PORT || 4000,
  env: process.env.NODE_ENV || 'development',
  tronGridEndpoint: process.env.TRON_GRID_ENDPOINT || 'https://api.trongrid.io', // mainnet
  // tronGridEndpoint: process.env.TRON_GRID_ENDPOINT || 'https://nile.trongrid.io', // testnet Nile
  tronGridApiKey: process.env.TRON_GRID_API_KEY, 
  privateKey: process.env.PRIVATE_KEY || '01', // demo key
}
