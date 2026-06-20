# Email Bill Organizer — Setup Guide

Syncs bills from iCloud Mail → Google Drive → `data/bills.json` in the dashboard.

## One-time setup

### 1. Python dependencies

```bash
cd scripts/email-organizer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. iCloud app-specific password

Apple requires an app-specific password for IMAP access:

1. Go to https://appleid.apple.com → Sign In
2. **Sign-In and Security** → **App-Specific Passwords** → Generate
3. Name it "Email Organizer" — copy the password

### 3. Google Drive credentials

1. Go to https://console.cloud.google.com/
2. Enable the **Google Drive API**
3. Create credentials: **OAuth client ID** → Desktop app → download JSON
4. Rename the downloaded file to `credentials.json` and place it here

### 4. Create config.json

```bash
cp config.example.json config.json
```

Fill in:
- `email_address`: your iCloud email (e.g. `you@mac.com`)
- `app_password`: the app-specific password from step 2
- `drive_root_folder_id`: the Google Drive folder ID where bills live

The folder ID is the last segment of the Drive URL:
`https://drive.google.com/drive/folders/THIS_PART`

### 5. First run (authorise Google Drive)

```bash
source venv/bin/activate
python organizer.py
```

A browser window opens — authorise Google Drive access. A `token.json` is saved so future runs are headless.

---

## Monthly sync

### Manual run

```bash
./scripts/email-organizer/monthly_update.sh
```

Or from inside the directory:

```bash
cd scripts/email-organizer
source venv/bin/activate
python sync_bills.py all
```

### Sync a specific category

```bash
python sync_bills.py internet    # Pepephone/MasMovil internet bills
python sync_bills.py community   # Administraciones Colmenarejo receipts
python sync_bills.py --peek      # Debug: show parsed text without writing
```

---

## Files that must NOT be committed

Add these to `.gitignore` (already done at repo root):

- `config.json` — contains IMAP password
- `credentials.json` — Google OAuth client secret
- `token.json` — Google OAuth access + refresh token
- `processed.json` — state log of processed email IDs
- `venv/` — local virtualenv

Use `config.example.json` as the committed template.

---

## Environment variable

`sync_bills.py` writes to `data/bills.json` in the repo root by default.
Override with:

```bash
DASHBOARD_DATA=/path/to/your/data python sync_bills.py all
```

---

## Adding a new bill provider

1. Add the sender email to `config.json` under the matching category
2. Add a parser function in `sync_bills.py` following the `parse_pepephone_bill` pattern
3. Wire it into `sync_internet_bills()` or add a new sync function
