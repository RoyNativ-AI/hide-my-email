#!/bin/bash

# Test script for alias lookup
# Usage: ./test-lookup.sh alias@yourdomain.com

ALIAS_EMAIL="${1:-test@alias.yourdomain.com}"
API_KEY="YOUR_API_KEY_HERE"
API_URL="http://localhost:4887"

echo "🔍 Testing alias lookup for: $ALIAS_EMAIL"
echo ""

curl -s \
  -H "X-API-Key: $API_KEY" \
  "$API_URL/api/aliases/lookup/$ALIAS_EMAIL" \
  | jq .

echo ""
echo "✅ Test complete!"
