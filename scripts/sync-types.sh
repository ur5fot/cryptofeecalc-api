#!/bin/bash

# Path to frontend project
FRONTEND_PATH="../CryptoFeeCalc.com"

# Create types directory if it doesn't exist
mkdir -p "$FRONTEND_PATH/types"

# Copy type definitions to frontend
cp src/types.ts "$FRONTEND_PATH/types/api.ts"

echo "✅ Types synced to frontend!"
