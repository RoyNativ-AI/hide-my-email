#!/bin/bash

# Add DNS CNAME record for app.maili2u.com

cf_token=$(cat ~/.wrangler/config/default.toml 2>/dev/null | grep -A 1 oauth_token | tail -1 | cut -d'"' -f2)

if [ -z "$cf_token" ]; then
  echo "Error: Could not find Cloudflare token"
  exit 1
fi

# Get Zone ID
zone_response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=maili2u.com" \
  -H "Authorization: Bearer $cf_token" \
  -H "Content-Type: application/json")

zone_id=$(echo "$zone_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$zone_id" ]; then
  echo "Error: Could not find zone ID for maili2u.com"
  exit 1
fi

echo "Zone ID: $zone_id"
echo "Adding CNAME record: app -> glacial-zebra-ao22uccy1d27a0wau2koqrbo.herokudns.com"

# Add CNAME record
result=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
  -H "Authorization: Bearer $cf_token" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "app",
    "content": "glacial-zebra-ao22uccy1d27a0wau2koqrbo.herokudns.com",
    "ttl": 1,
    "proxied": false
  }')

echo "$result" | jq '.'

if echo "$result" | grep -q '"success":true'; then
  echo ""
  echo "✅ DNS record added successfully!"
  echo "app.maili2u.com -> glacial-zebra-ao22uccy1d27a0wau2koqrbo.herokudns.com"
else
  echo ""
  echo "❌ Failed to add DNS record"
  echo "Please add manually in Cloudflare Dashboard:"
  echo "Type: CNAME"
  echo "Name: app"
  echo "Target: glacial-zebra-ao22uccy1d27a0wau2koqrbo.herokudns.com"
fi
