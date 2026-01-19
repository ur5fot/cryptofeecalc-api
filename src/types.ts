export interface EstimateRequest {
    chain: 'tron'
    asset: 'TRX'
    amount: string
    from: string
    to: string
    signatureCount?: number
}

export interface BandwidthInfo {
    available: string
    usedBytes: string
    priceSunPerByte: string
    burnSun: string
}


export interface EstimateResponse {
    chain: 'tron'
    asset: 'TRX'
    amount: string
    amountSun: string
    from: string
    to: string
    bandwidth: BandwidthInfo
    createAccountFeeSun: string
    totalFeeSun: string
    totalFeeTrx: number
}

export interface HealthResponse {
    status: 'ok'
}

export interface ErrorResponse {
    error: string
}

export interface Env {
    TRON_GRID_API_KEY: string
    TRON_GRID_ENDPOINT: string
    RATE_LIMIT_KV: KVNamespace
}