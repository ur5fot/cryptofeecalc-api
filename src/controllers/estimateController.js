const { TronWeb } = require('tronweb')
const { tronGridEndpoint, tronGridApiKey } = require('../config/env')

const tronWeb = new TronWeb({
  fullHost: tronGridEndpoint,
  headers: { 'TRON-PRO-API-KEY': tronGridApiKey }
})

const getParamValue = (params, key, fallback) => {
  const match = params.find((param) => param.key === key)
  return match ? match.value : fallback
}

const toBigInt = (value) => BigInt(value || 0)

const safeDiff = (value) => (value < 0n ? 0n : value)

const estimateFee = async (req, res, next) => {
  try {
    const { chain, asset, amount, from, to, signatureCount = 1 } = req.body || {}

    if (!chain || chain.toLowerCase() !== 'tron') {
      return res.status(400).json({ error: 'Only chain=tron is supported.' })
    }

    if (!asset || asset.toUpperCase() !== 'TRX') {
      return res.status(400).json({ error: 'Only asset=TRX is supported for now.' })
    }

    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'amount, from, and to are required.' })
    }

    if (!TronWeb.isAddress(from) || !TronWeb.isAddress(to)) {
      return res.status(400).json({ error: 'Invalid TRON address.' })
    }

    const amountSun = TronWeb.toSun(amount)
    const [resources, chainParams, toAccount] = await Promise.all([
      tronWeb.trx.getAccountResources(from),
      tronWeb.trx.getChainParameters(),
      tronWeb.trx.getAccount(to)
    ])

    const bandwidthPrice = BigInt(getParamValue(chainParams, 'getTransactionFee', 1000))
    const createAccountFee = BigInt(
      getParamValue(chainParams, 'getCreateNewAccountFeeInSystemContract',
        getParamValue(chainParams, 'getCreateAccountFee', 0)
      )
    )

    const tx = await tronWeb.transactionBuilder.sendTrx(to, amountSun, from)
    const rawSize = BigInt(Buffer.from(tx.raw_data_hex, 'hex').length)
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

    return res.status(200).json({
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
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = { estimateFee }
