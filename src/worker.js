import { TronWeb } from 'tronweb'

// Configuration
const ALLOWED_ORIGINS = [
  'https://cryptofeecalc.com',
  'https://www.cryptofeecalc.com',
  'http://localhost:3000' // для локальной разработки
]

const MAX_SIGNATURE_COUNT = 10
const SIGNATURE_SIZE_BYTES = 65

// Utility functions
const getOrigin = (request) => request.headers.get('Origin')

const getCorsHeaders = (origin) => {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

const jsonResponse = (data, status = 200, request = null) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(request ? getCorsHeaders(getOrigin(request)) : {})
  }

  return new Response(JSON.stringify(data), { status, headers })
}

const initTronWeb = (env) =>
  new TronWeb({
    fullHost: env.TRON_GRID_ENDPOINT,
    headers: env.TRON_GRID_API_KEY ? { 'TRON-PRO-API-KEY': env.TRON_GRID_API_KEY } : {}
  })

const getParamValue = (params, key, fallback) => {
  const match = params.find((param) => param.key === key)
  return match ? match.value : fallback
}

const toBigInt = (value) => {
  try {
    return BigInt(value || 0)
  } catch {
    return 0n
  }
}

const safeDiff = (value) => (value < 0n ? 0n : value)

// Validation
const validateEstimateRequest = (body) => {
  const { chain, asset, amount, from, to, signatureCount } = body || {}

  if (!chain || chain.toLowerCase() !== 'tron') {
    return { valid: false, error: 'Only chain=tron is supported.' }
  }

  if (!asset || asset.toUpperCase() !== 'TRX') {
    return { valid: false, error: 'Only asset=TRX is supported.' }
  }

  if (!amount || !from || !to) {
    return { valid: false, error: 'amount, from, and to are required.' }
  }

  // Validate amount format
  if (!/^\d+\.?\d*$/.test(amount) || parseFloat(amount) <= 0) {
    return { valid: false, error: 'Invalid amount format. Must be a positive number.' }
  }

  // Validate TRON addresses
  if (!TronWeb.isAddress(from)) {
    return { valid: false, error: 'Invalid from address.' }
  }

  if (!TronWeb.isAddress(to)) {
    return { valid: false, error: 'Invalid to address.' }
  }

  // Validate signatureCount
  const sigCount = Number(signatureCount) || 1
  if (!Number.isInteger(sigCount) || sigCount < 1 || sigCount > MAX_SIGNATURE_COUNT) {
    return {
      valid: false,
      error: `signatureCount must be an integer between 1 and ${MAX_SIGNATURE_COUNT}.`
    }
  }

  return { valid: true }
}

// Core estimation logic
const estimateTrxFee = async (tronWeb, body) => {
  const validation = validateEstimateRequest(body)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const { amount, from, to, signatureCount = 1 } = body

  try {
    const amountSun = TronWeb.toSun(amount)

    const [resources, chainParams, toAccount] = await Promise.all([
      tronWeb.trx.getAccountResources(from),
      tronWeb.trx.getChainParameters(),
      tronWeb.trx.getAccount(to)
    ])

    const bandwidthPrice = toBigInt(getParamValue(chainParams, 'getTransactionFee', 1000))
    const createAccountFee = toBigInt(
      getParamValue(
        chainParams,
        'getCreateNewAccountFeeInSystemContract',
        getParamValue(chainParams, 'getCreateAccountFee', 0)
      )
    )

    const tx = await tronWeb.transactionBuilder.sendTrx(to, amountSun, from)
    const rawSize = BigInt(Math.ceil(tx.raw_data_hex.length / 2))
    const signatures = Math.max(1, Number(signatureCount) || 1)
    const txSize = rawSize + BigInt(SIGNATURE_SIZE_BYTES * signatures)

    const freeLimit = toBigInt(resources.freeNetLimit)
    const freeUsed = toBigInt(resources.freeNetUsed)
    const stakedLimit = toBigInt(resources.NetLimit)
    const stakedUsed = toBigInt(resources.NetUsed)
    const bandwidthAvailable = safeDiff(freeLimit - freeUsed) + safeDiff(stakedLimit - stakedUsed)

    const bandwidthDeficit = txSize > bandwidthAvailable ? txSize - bandwidthAvailable : 0n
    const bandwidthBurn = bandwidthDeficit * bandwidthPrice

    const accountExists = toAccount && (toAccount.address || toAccount.create_time)
    const createAccountBurn = accountExists ? 0n : createAccountFee

    const totalFeeSun = bandwidthBurn + createAccountBurn

    return {
      chain: 'tron',
      asset: 'TRX',
      amount,
      amountSun: amountSun.toString(),
      from,
      to,
      bandwidth: {
        available: bandwidthAvailable.toString(),
        usedBytes: txSize.toString(),
        priceSunPerByte: bandwidthPrice.toString(),
        burnSun: bandwidthBurn.toString()
      },
      createAccountFeeSun: createAccountBurn.toString(),
      totalFeeSun: totalFeeSun.toString(),
      totalFeeTrx: Number(totalFeeSun) / 1_000_000
    }
  } catch (error) {
    // Don't expose internal error details in production
    console.error('Estimation error:', error)
    return { error: 'Failed to estimate fee. Please check your inputs and try again.' }
  }
}

// Main worker handler
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = getOrigin(request)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin)
      })
    }

    // Health check endpoint
    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ status: 'ok' }, 200, request)
    }

    // Estimate endpoint
    if (url.pathname === '/api/estimate' && request.method === 'POST') {
      let payload = null

      try {
        payload = await request.json()
      } catch (error) {
        return jsonResponse({ error: 'Invalid JSON body.' }, 400, request)
      }

      try {
        const tronWeb = initTronWeb(env)
        const result = await estimateTrxFee(tronWeb, payload)

        if (result.error) {
          return jsonResponse(result, 400, request)
        }

        return jsonResponse(result, 200, request)
      } catch (error) {
        console.error('Unexpected error:', error)
        return jsonResponse({ error: 'Internal server error.' }, 500, request)
      }
    }

    // 404 for all other routes
    return jsonResponse({ error: 'Not found' }, 404, request)
  }
}
