#!/usr/bin/env bash
# Uploads the made-up demo book covers to the LOCAL Supabase (item-images/demo/).
# Run after `npx supabase db reset`, which loads supabase/seed.sql.
set -euo pipefail
cd "$(dirname "$0")/../.."

KEY=$(npx supabase status -o json | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).SERVICE_ROLE_KEY))')
API=$(npx supabase status -o json | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).API_URL))')

for file in supabase/demo/covers/*.png; do
  name=$(basename "$file")
  curl -sf -X POST "$API/storage/v1/object/item-images/demo/$name" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: image/png" -H "x-upsert: true" \
    --data-binary "@$file" > /dev/null
  echo "✓ $name"
done
