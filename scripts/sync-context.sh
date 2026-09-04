#!/usr/bin/env bash
# Pull the live CV Builder state (Vercel Blob in production, via the
# authenticated /api/cv/export route) into data/*.json, and push to GitHub if
# anything changed. Mirrors scripts/email-organizer/monthly_update.sh's
# commit+push pattern, for the CV Builder data instead of the bills data.
#
# Usage:
#   DASHBOARD_PASSWORD=... ./scripts/sync-context.sh [site_url]
#
# Run on demand after a session in the CV Builder (not on a schedule).
set -euo pipefail
cd "$(dirname "$0")/.."

SITE_URL="${1:-https://nl93.vercel.app}"
PASSWORD="${DASHBOARD_PASSWORD:-}"
if [ -z "$PASSWORD" ]; then
  echo "Set DASHBOARD_PASSWORD (the site's dashboard/CV builder password) and re-run." >&2
  echo "Example: DASHBOARD_PASSWORD=... ./scripts/sync-context.sh" >&2
  exit 1
fi

COOKIEJAR="$(mktemp)"
EXPORT_FILE="$(mktemp)"
trap 'rm -f "$COOKIEJAR" "$EXPORT_FILE"' EXIT

echo "Authenticating to $SITE_URL ..."
curl -sf -c "$COOKIEJAR" -X POST "$SITE_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}" > /dev/null

echo "Fetching live export ..."
curl -sf -b "$COOKIEJAR" "$SITE_URL/api/cv/export" -o "$EXPORT_FILE"

echo "Writing data/*.json ..."
python3 - "$EXPORT_FILE" <<'PYEOF'
import json
import sys

with open(sys.argv[1]) as fh:
    data = json.load(fh)

targets = {
    "data/profile.json": data["profile"],
    "data/applications.json": data["applications"],
    "data/cv-versions.json": data["cv_versions"],
    "data/voice-samples.json": data["voice_samples"],
}
for path, content in targets.items():
    with open(path, "w") as fh:
        json.dump(content, fh, indent=2)
        fh.write("\n")

print(f"exported_at: {data.get('exported_at')}")
PYEOF

if git diff --quiet -- data/profile.json data/applications.json data/cv-versions.json data/voice-samples.json; then
  echo "No changes — Blob matches what's already in the repo."
  exit 0
fi

git add data/profile.json data/applications.json data/cv-versions.json data/voice-samples.json
git commit -m "Sync CV Builder context from Blob ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
git push
echo "Synced and pushed."
