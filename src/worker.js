import { TronWeb } from 'tronweb'

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })

const initTronWeb = (env) =>
  new TronWeb({
    fullHost: env.TRON_GRID_ENDPOINT || 'https://nile.trongrid.io',
    headers: env.TRON_GRID_API_KEY ? { 'TRON-PRO-API-KEY': env.TRON_GRID_API_KEY } : {}
  })

const getParamValue = (params, key, fallback) => {
  const match = params.find((param) => param.key === key)
  return match ? match.value : fallback
}

const toBigInt = (value) => BigInt(value || 0)

const safeDiff = (value) => (value < 0n ? 0n : value)

const estimateTrxFee = async (tronWeb, body) => {
  const { chain, asset, amount, from, to, signatureCount = 1 } = body || {}

  if (!chain || chain.toLowerCase() !== 'tron') {
    return { error: 'Only chain=tron is supported.' }
  }

  if (!asset || asset.toUpperCase() !== 'TRX') {
    return { error: 'Only asset=TRX is supported for now.' }
  }

  if (!amount || !from || !to) {
    return { error: 'amount, from, and to are required.' }
  }

  if (!TronWeb.isAddress(from) || !TronWeb.isAddress(to)) {
    return { error: 'Invalid TRON address.' }
  }

  const amountSun = TronWeb.toSun(amount)

  const [resources, chainParams, toAccount] = await Promise.all([
    tronWeb.trx.getAccountResources(from),
    tronWeb.trx.getChainParameters(),
    tronWeb.trx.getAccount(to)
  ])

  const bandwidthPrice = BigInt(getParamValue(chainParams, 'getTransactionFee', 1000))
  const createAccountFee = BigInt(
    getParamValue(
      chainParams,
      'getCreateNewAccountFeeInSystemContract',
      getParamValue(chainParams, 'getCreateAccountFee', 0)
    )
  )

  const tx = await tronWeb.transactionBuilder.sendTrx(to, amountSun, from)
  const rawSize = BigInt(Math.ceil(tx.raw_data_hex.length / 2))
  const signatures = Math.max(1, Number(signatureCount) || 1)
  const txSize = rawSize + BigInt(65 * signatures)

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
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ status: 'ok' })
    }

    if (url.pathname === '/api/estimate' && request.method === 'POST') {
      let payload = null

      try {
        payload = await request.json()
      } catch (error) {
        return jsonResponse({ error: 'Invalid JSON body.' }, 400)
      }

      try {
        const tronWeb = initTronWeb(env)
        const result = await estimateTrxFee(tronWeb, payload)

        if (result.error) {
          return jsonResponse(result, 400)
        }

        return jsonResponse(result)
      } catch (error) {
        return jsonResponse({ error: error?.message || 'Unexpected error' }, 500)
      }
    }

    return jsonResponse({ error: 'Not found' }, 404)
  }
}
