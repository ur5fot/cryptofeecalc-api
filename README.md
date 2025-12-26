# CryptoFeeCalc API

Minimal TRON fee estimation API (TRX transfers).

## Setup

```bash
npm install
npm run dev
```

### Environment

The API uses TronWeb and a TronGrid endpoint.

- `TRON_GRID_ENDPOINT` (default: `https://nile.trongrid.io`)
- `TRON_GRID_API_KEY` (required for TronGrid)

## Endpoints

### GET /health

Response:
```json
{ "status": "ok" }
```

### POST /api/estimate

Request:
```json
{
  "chain": "tron",
  "asset": "TRX",
  "amount": "10",
  "from": "T...",
  "to": "T...",
  "signatureCount": 1
}
```

Response:
```json
{
  "chain": "tron",
  "asset": "TRX",
  "amount": "10",
  "amountSun": "10000000",
  "from": "T...",
  "to": "T...",
  "bandwidth": {
    "available": "600",
    "usedBytes": "199",
    "priceSunPerByte": "1000",
    "burnSun": "0"
  },
  "createAccountFeeSun": "0",
  "totalFeeSun": "0",
  "totalFeeTrx": 0
}
```

## How the estimate works

1) Builds a TRX transfer transaction with TronWeb to get `raw_data_hex`.
2) Estimates total size as `raw_data` bytes + `65 * signatureCount`.
3) Gets account resources (`Bandwidth`) for the sender.
4) Gets chain parameters (Bandwidth price and create account fee).
5) Calculates burned TRX if Bandwidth is insufficient.
6) Adds create account fee if the recipient does not exist.

## Limitations

- Only `chain=tron` and `asset=TRX` are supported right now.
- If a wallet adds extra fields (e.g., `permissionId` or memo), actual Bandwidth may be higher.
- For 1:1 accuracy, use a signed transaction and measure its final byte length.
