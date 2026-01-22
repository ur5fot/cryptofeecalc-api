# CryptoFeeCalc API

TRON fee estimation API built with Cloudflare Workers and TypeScript.

## Tech Stack

- **Runtime**: Cloudflare Workers (Edge)
- **Language**: TypeScript
- **Blockchain**: TronWeb ^6.1.1
- **Package Manager**: npm

## Setup

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.dev.vars` for local development:

```bash
cp .env.example .dev.vars
```

Then edit `.dev.vars` and add your actual TRON Grid API key.

**⚠️ Important:** Never commit `.dev.vars` to git! It's already in `.gitignore`.

| Variable | Description | Default |
|----------|-------------|---------|
| `TRON_GRID_API_KEY` | TronGrid API key (required) | — |
| `TRON_GRID_ENDPOINT` | TronGrid API endpoint | `https://api.trongrid.io` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma separated) | — |
| `RATE_LIMIT_PER_MINUTE` | Requests per minute per IP | `10` |
| `RATE_LIMIT_PER_HOUR` | Requests per hour per IP | `100` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local development server (Wrangler) |
| `npm run type-check` | Run TypeScript type checking |
| `npm run deploy:dev` | Deploy to dev environment |
| `npm run deploy:prod` | Deploy to production |
| `npm run sync-types` | Sync types to frontend project |

## Development

Run locally:
```bash
npm run dev
```

The API will be available at `http://localhost:8787`.

### Type Sync

Types are automatically synced to the frontend project on every commit via husky pre-commit hook. To manually sync:

```bash
npm run sync-types
```

This copies `src/types.ts` to `../CryptoFeeCalc.com/types/api.ts`.

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{ "status": "ok" }
```

### POST /api/estimate

Estimate TRX transfer fee.

**Request:**
```json
{
  "chain": "tron",
  "asset": "TRX",
  "amount": "100",
  "from": "TGrzqMjhZH85X8q3EkUfFdXUB3zSW8oDH7",
  "to": "TYukBQZ2XXCcRCReAUguyXncCWNY9CEiDQ",
  "signatureCount": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chain` | string | Yes | Must be `"tron"` |
| `asset` | string | Yes | Must be `"TRX"` |
| `amount` | string | Yes | Amount in TRX (e.g., `"100"`) |
| `from` | string | Yes | Sender TRON address |
| `to` | string | Yes | Recipient TRON address |
| `signatureCount` | number | No | Number of signatures (1-10, default: 1) |

**Success Response (200):**
```json
{
  "chain": "tron",
  "asset": "TRX",
  "amount": "100",
  "amountSun": "100000000",
  "from": "TGrzqMjhZH85X8q3EkUfFdXUB3zSW8oDH7",
  "to": "TYukBQZ2XXCcRCReAUguyXncCWNY9CEiDQ",
  "bandwidth": {
    "available": "600",
    "usedBytes": "264",
    "priceSunPerByte": "1000",
    "burnSun": "0"
  },
  "createAccountFeeSun": "0",
  "totalFeeSun": "0",
  "totalFeeTrx": 0
}
```

| Field | Type | Description |
|-------|------|-------------|
| `amount` | string | Original amount in TRX |
| `amountSun` | string | Amount in Sun (1 TRX = 1,000,000 Sun) |
| `bandwidth.available` | string | Available bandwidth for sender |
| `bandwidth.usedBytes` | string | Estimated transaction size in bytes |
| `bandwidth.priceSunPerByte` | string | Current bandwidth price |
| `bandwidth.burnSun` | string | TRX burned for bandwidth (if insufficient) |
| `createAccountFeeSun` | string | Fee if recipient account doesn't exist |
| `totalFeeSun` | string | Total fee in Sun |
| `totalFeeTrx` | number | Total fee in TRX |

**Error Response (400):**
```json
{
  "error": "Invalid from address."
}
```

## How Fee Estimation Works

1. **Build Transaction**: Creates a TRX transfer transaction with TronWeb to get `raw_data_hex`
2. **Calculate Size**: Estimates total size as `raw_data bytes + (65 × signatureCount)`
3. **Get Resources**: Fetches sender's available bandwidth (free + staked)
4. **Get Chain Params**: Retrieves current bandwidth price and account creation fee
5. **Calculate Bandwidth Burn**: If bandwidth is insufficient, calculates TRX to burn
6. **Add Account Fee**: If recipient doesn't exist, adds account creation fee
7. **Return Total**: Returns total fee breakdown

## CORS Configuration

Allowed origins:
- `https://cryptofeecalc.com`
- `https://www.cryptofeecalc.com`
- `http://localhost:3000` (development)

## Deployment

### Dev Environment
```bash
npm run deploy:dev
```
Deploys to `cryptofeecalc-api-dev` worker.

### Production
```bash
npm run deploy:prod
```
Deploys to `cryptofeecalc-api` worker.

### Environment Secrets

Set secrets via Wrangler:
```bash
wrangler secret put TRON_GRID_API_KEY --env prod
```

Non-secret vars are managed in `wrangler.jsonc` under `env.*.vars`.

## Project Structure

```
cryptofeecalc-api/
├── src/
│   ├── worker.ts      # Main Cloudflare Worker handler
│   └── types.ts       # TypeScript type definitions
├── scripts/
│   └── sync-types.sh  # Script to sync types to frontend
├── .husky/
│   └── pre-commit     # Auto-sync types on commit
├── wrangler.jsonc     # Cloudflare Workers configuration
├── tsconfig.json      # TypeScript configuration
├── package.json
└── README.md
```

## Limitations

- Only `chain=tron` and `asset=TRX` are supported
- Multi-signature wallets: actual bandwidth may vary with additional fields
- For exact fee, use a signed transaction and measure final byte length
- `signatureCount` is limited to 1-10

## Type Definitions

Types are defined in `src/types.ts` and shared with the frontend:

```typescript
interface EstimateRequest {
  chain: 'tron'
  asset: 'TRX'
  amount: string
  from: string
  to: string
  signatureCount?: number
}

interface EstimateResponse {
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

interface BandwidthInfo {
  available: string
  usedBytes: string
  priceSunPerByte: string
  burnSun: string
}
```

## License

Private
