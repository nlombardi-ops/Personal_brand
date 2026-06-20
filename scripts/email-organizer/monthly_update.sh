#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Monthly Dashboard Update
# Syncs bills from Google Drive → updates JSON → pushes to Vercel
#
# Setup (one-time):
#   chmod +x scripts/email-organizer/monthly_update.sh
#
# Manual run (from repo root):
#   ./scripts/email-organizer/monthly_update.sh
#
# Or from any directory:
#   /path/to/repo/scripts/email-organizer/monthly_update.sh
# ─────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ORGANIZER_DIR="$SCRIPT_DIR"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$ORGANIZER_DIR/monthly_update.log"
VENV="$ORGANIZER_DIR/venv/bin/activate"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

log "═══════════════════════════════════════════"
log "Starting monthly dashboard update"
log "═══════════════════════════════════════════"

# Activate venv (create if missing)
if [ ! -f "$VENV" ]; then
    log "⚙️  Creating virtualenv..."
    python3 -m venv "$ORGANIZER_DIR/venv"
    source "$VENV"
    pip install -r "$ORGANIZER_DIR/requirements.txt" --quiet
else
    source "$VENV"
fi

# Sync bills from Google Drive (internet + community)
log "📱 Syncing internet + community bills from Drive..."
cd "$ORGANIZER_DIR"
python sync_bills.py all 2>&1 | tee -a "$LOG_FILE"

# Commit and push if data changed
log "📤 Pushing updated data to GitHub..."
cd "$REPO_ROOT"

if git diff --quiet data/bills.json; then
    log "ℹ️  No changes in bills.json — skipping commit"
else
    git add data/bills.json
    git commit -m "Monthly bill sync — $(date '+%B %Y')"
    git push
    log "✅ Pushed to GitHub → Vercel will auto-deploy"
fi

log "🏁 Monthly update complete"
log ""
