#!/bin/sh
# Store builds on this Mac instead of the EAS cloud (no cloud build allowance used), then upload.
#
#   scripts/build-local.sh ios        # → ../lenderoo-builds/lenderoo-ios.ipa, then TestFlight
#   scripts/build-local.sh android    # → ../lenderoo-builds/lenderoo-android.aab, then Play (alpha, draft)
#   scripts/build-local.sh ios --no-submit
#
# Needs: Xcode, Java 21 + Android SDK, signed in to EAS (npx eas-cli whoami), and a local
# ./google-services.json (gitignored; Firebase project lenderoo-prod) for Android.
# Build numbers come from EAS (appVersionSource: remote) and go up by one each run.
set -e
cd "$(dirname "$0")/.."
platform="$1"; shift || true
case "$platform" in ios) out=../lenderoo-builds/lenderoo-ios.ipa ;; android) out=../lenderoo-builds/lenderoo-android.aab ;; *) echo "usage: $0 ios|android [--no-submit]"; exit 1 ;; esac
mkdir -p ../lenderoo-builds

# The local builder calls `yarn`; this repo's Yarn 4 comes from corepack.
shim="$(mktemp -d)"; printf '#!/bin/sh\nexec corepack yarn "$@"\n' > "$shim/yarn"; chmod +x "$shim/yarn"
export PATH="$shim:$PATH"

# Local builds don't load EAS file variables (GOOGLE_SERVICES_JSON) and don't copy gitignored files.
if [ "$platform" = android ]; then
  [ -f google-services.json ] || { echo "Missing ./google-services.json (Firebase console → lenderoo-prod → Android app)"; exit 1; }
  export GOOGLE_SERVICES_JSON="$PWD/google-services.json"
fi

npx eas-cli build --platform "$platform" --profile production --local --non-interactive --output "$out"
[ "$1" = "--no-submit" ] || npx eas-cli submit --platform "$platform" --profile production --path "$out" --non-interactive
