#!/usr/bin/env python3
"""
Sync bills from Google Drive PDFs → data/bills.json in the dashboard repo.

Reads PDF invoices from Drive folders, extracts amounts with pdfplumber,
and writes structured JSON for the Next.js dashboard.

Usage:
  python sync_bills.py              # sync all categories
  python sync_bills.py all          # same
  python sync_bills.py internet     # internet only
  python sync_bills.py community    # community only
  python sync_bills.py --peek       # show extracted text (debug)
"""

import io
import json
import os
import re
import sys
import tempfile
from pathlib import Path

import pdfplumber
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/drive"]
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent.parent  # scripts/email-organizer → scripts → repo_root
DASHBOARD_DATA = Path(os.environ.get("DASHBOARD_DATA", str(REPO_ROOT / "data")))

# Google Drive folder IDs — run find_folders.py to discover these
FOLDERS = {
    "phone_internet": "1UKLsmvyQ_1er64dyPHLZJe17xG_Uqeby",
    "community": "1b_TuM2oeIwUI1klonWONT1XTTX0ErSUY",
    # "energy": None,  # see issue A4 — folder ID not yet identified
}


def get_drive_service():
    """Authenticate and return Drive API service (reuses email-organizer creds)."""
    token_file = SCRIPT_DIR / "token.json"
    creds_file = SCRIPT_DIR / "credentials.json"
    creds = None

    if token_file.exists():
        creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_file), SCOPES)
            creds = flow.run_local_server(port=0)
        token_file.write_text(creds.to_json())

    return build("drive", "v3", credentials=creds)


def list_files(drive, folder_id, extensions=None):
    """List files in a Drive folder (recursive). Filter by extensions if given."""
    if extensions is None:
        extensions = {".pdf", ".html", ".htm"}
    found = []
    query = f"'{folder_id}' in parents and trashed = false"
    results = drive.files().list(
        q=query,
        fields="files(id, name, mimeType, createdTime)",
        pageSize=200,
    ).execute()

    for f in results.get("files", []):
        if f["mimeType"] == "application/vnd.google-apps.folder":
            found.extend(list_files(drive, f["id"], extensions))
        else:
            ext = "." + f["name"].rsplit(".", 1)[-1].lower() if "." in f["name"] else ""
            if ext in extensions:
                found.append(f)

    return sorted(found, key=lambda x: x["name"])


def list_pdfs(drive, folder_id):
    return list_files(drive, folder_id, extensions={".pdf"})


def download_file(drive, file_id):
    """Download a file from Drive and return bytes."""
    request = drive.files().get_media(fileId=file_id)
    return request.execute()


download_pdf = download_file


def extract_text_from_pdf(pdf_bytes):
    """Extract all text from a PDF."""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def extract_text_from_html(html_bytes):
    """Extract text from an HTML file (email snapshot)."""
    from html.parser import HTMLParser

    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.parts = []
            self._skip = False

        def handle_starttag(self, tag, attrs):
            if tag in ("script", "style"):
                self._skip = True

        def handle_endtag(self, tag):
            if tag in ("script", "style"):
                self._skip = False

        def handle_data(self, data):
            if not self._skip:
                self.parts.append(data)

    html_text = html_bytes.decode("utf-8", errors="replace")
    parser = TextExtractor()
    parser.feed(html_text)
    return "\n".join(parser.parts)


def extract_text(file_bytes, filename=""):
    """Extract text from PDF or HTML based on filename."""
    if filename.lower().endswith((".html", ".htm")):
        return extract_text_from_html(file_bytes)
    else:
        return extract_text_from_pdf(file_bytes)


# ─── Pepephone / MasMovil parser ────────────────────────────────────────────

def normalize_text(text):
    """Replace non-breaking spaces, zero-width chars, and normalize newlines."""
    text = text.replace("\xa0", " ")
    text = text.replace("​", "")
    text = text.replace("­", "")
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")
    return text


def parse_pepephone_bill(text, filename, debug=False):
    """Extract billing data from a Pepephone/MasMovil (XFERA MOVILES) invoice."""
    text = normalize_text(text)

    result = {
        "provider": "Pepephone",
        "plan": None,
        "month": None,
        "total": None,
    }

    m = re.search(r"(\d+[.,]\d{2})\s*€\s+TOTAL A PAGAR", text)
    if m:
        result["total"] = float(m.group(1).replace(",", "."))
    else:
        m = re.search(r"Total factura\s+(\d+[.,]\d{2})\s*€", text)
        if m:
            result["total"] = float(m.group(1).replace(",", "."))

    m = re.search(
        r"Periodo\s+facturado\s*:\s*Del\s+\d{2}/\d{2}/\d{4}\s+al\s+(\d{2})/(\d{2})/(\d{4})",
        text,
    )
    if m:
        result["month"] = f"{m.group(3)}-{m.group(2)}"
    else:
        m = re.search(r"Del\s+\d{2}/\d{2}/\d{4}\s+al\s+(\d{2})/(\d{2})/(\d{4})", text)
        if m:
            result["month"] = f"{m.group(3)}-{m.group(2)}"
        else:
            m = re.search(r"Fecha de emisi.n:\s*(\d{2})/(\d{2})/(\d{4})", text)
            if m:
                result["month"] = f"{m.group(3)}-{m.group(2)}"

    m = re.search(r"(FIBRA\s+\d+\s*[GgMm]b\s*\+\s*TARIFA\s+M.S\s+\d+\s*GB)", text)
    if m:
        result["plan"] = m.group(1).strip()

    return result


# ─── Community / Administraciones Colmenarejo parser ────────────────────────

MONTH_MAP_ES = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
    "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
    "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12",
}


def parse_community_bill(text, filename, debug=False):
    """Parse a community receipt from Administraciones Colmenarejo."""
    text = normalize_text(text)

    result = {
        "provider": "Adm. Colmenarejo",
        "month": None,
        "cuota": 0,
        "water": 0,
        "extraordinary": 0,
    }

    m = re.search(r"CUOTA\s+ORDINARIA\s+(\d+[.,]\d{1,2})", text)
    if m:
        result["cuota"] = float(m.group(1).replace(",", "."))

    m = re.search(r"AGUA\s+\S+\s+\S+\s+\S+\s+(\d+[.,]\d{1,2})", text)
    if not m:
        m = re.search(r"AGUA.*?(\d+[.,]\d{1,2})\s*$", text, re.MULTILINE)
    if m:
        result["water"] = float(m.group(1).replace(",", "."))

    m = re.search(r"(?:EXTRAORDINARI[AO]|DERRAMA)\s+.*?(\d+[.,]\d{1,2})", text)
    if m:
        result["extraordinary"] = float(m.group(1).replace(",", "."))

    m = re.search(
        r"Recibo\s+\S+\s+de\s+\d{1,2}\s+de\s+(\w+)\s+de\s+(\d{4})",
        text,
    )
    if m:
        month_name = m.group(1).lower()
        year = m.group(2)
        month_num = MONTH_MAP_ES.get(month_name)
        if month_num:
            result["month"] = f"{year}-{month_num}"

    if not result["month"]:
        m = re.search(
            r"Fecha de emisi.n[:\s]+\d{1,2}\s+de\s+(\w+)\s+de\s+(\d{4})",
            text,
        )
        if m:
            month_name = m.group(1).lower()
            year = m.group(2)
            month_num = MONTH_MAP_ES.get(month_name)
            if month_num:
                result["month"] = f"{year}-{month_num}"

    if not result["month"]:
        m = re.search(r"AGUA\s+(\d{2})/(\d{2})/(\d{2})", text)
        if m:
            day, mon, yr = m.group(1), m.group(2), m.group(3)
            year = f"20{yr}" if int(yr) < 50 else f"19{yr}"
            result["month"] = f"{year}-{mon}"

    return result


def sync_community_bills(drive):
    """Fetch community receipts from Drive, extract data, return list."""
    folder_id = FOLDERS.get("community")
    if not folder_id:
        print("  ⚠️  Community folder ID not set.")
        return []

    all_files = list_files(drive, folder_id, extensions={".html", ".htm"})
    files = [f for f in all_files if "Nuevo recibo" in f["name"]]

    if not files:
        print("  No 'Nuevo recibo' files found in community folder")
        return []

    print(f"  Found {len(files)} receipts (filtered from {len(all_files)} HTML files)")
    bills = []
    for f in files:
        print(f"  Processing: {f['name']}...", end=" ")
        try:
            content = download_file(drive, f["id"])
            text = extract_text(content, f["name"])
            parsed = parse_community_bill(text, f["name"])

            if parsed["month"] and (parsed["cuota"] > 0 or parsed["water"] > 0):
                bills.append({
                    "month": parsed["month"],
                    "cuota": parsed["cuota"],
                    "water": parsed["water"],
                    "extraordinary": parsed["extraordinary"],
                    "provider": parsed["provider"],
                })
                parts = []
                if parsed["cuota"]: parts.append(f"cuota={parsed['cuota']}€")
                if parsed["water"]: parts.append(f"water={parsed['water']}€")
                if parsed["extraordinary"]: parts.append(f"extra={parsed['extraordinary']}€")
                print(f"✅ {parsed['month']} → {', '.join(parts)}")
            else:
                print(f"⚠️  Skip (month={parsed['month']}, cuota={parsed['cuota']}, water={parsed['water']})")
        except Exception as e:
            print(f"❌ {e}")

    return sorted(bills, key=lambda x: x["month"])


def peek_mode(drive):
    """Debug mode: show file text content without updating anything."""
    for label, folder_id in FOLDERS.items():
        if not folder_id:
            print(f"\n⚠️  Folder '{label}' has no ID set — skipping")
            continue

        print(f"\n{'='*60}")
        print(f"📁 Folder: {label} ({folder_id})")
        print(f"{'='*60}")

        files = list_files(drive, folder_id)
        if not files:
            print("  (empty)")
            continue

        for f in files:
            print(f"\n📄 {f['name']}")
            print(f"   Created: {f.get('createdTime', '?')}")
            try:
                content = download_file(drive, f["id"])
                text = extract_text(content, f["name"])
                print(f"   Text length: {len(text)} chars")
                print("   --- First 1500 chars ---")
                print(text[:1500])
                print("   --- Parsed result ---")
                if label == "community":
                    parsed = parse_community_bill(text, f["name"], debug=True)
                else:
                    parsed = parse_pepephone_bill(text, f["name"], debug=True)
                print(f"   {json.dumps(parsed, indent=2)}")
            except Exception as e:
                print(f"   ❌ Error: {e}")
            print()


def sync_internet_bills(drive):
    """Fetch phone/internet PDFs from Drive, extract data, return list."""
    folder_id = FOLDERS["phone_internet"]
    pdfs = list_pdfs(drive, folder_id)

    if not pdfs:
        print("No PDFs found in phone/internet folder")
        return []

    bills = []
    for f in pdfs:
        print(f"  Processing: {f['name']}...", end=" ")
        try:
            content = download_pdf(drive, f["id"])
            text = extract_text(content)
            parsed = parse_pepephone_bill(text, f["name"])

            if parsed["total"] and parsed["month"]:
                bills.append({
                    "month": parsed["month"],
                    "total": parsed["total"],
                    "provider": parsed["provider"],
                    "plan": parsed["plan"],
                })
                print(f"✅ {parsed['month']} → {parsed['total']}€")
            else:
                print(f"⚠️  Could not parse (total={parsed['total']}, month={parsed['month']})")
        except Exception as e:
            print(f"❌ {e}")

    return sorted(bills, key=lambda x: x["month"])


def update_bills_json(internet_bills=None, community_bills=None):
    """Merge synced bills into data/bills.json."""
    bills_path = DASHBOARD_DATA / "bills.json"

    with open(bills_path) as f:
        data = json.load(f)

    if internet_bills is not None:
        data["internet"] = internet_bills
        print(f"   Internet bills: {len(internet_bills)} entries")

    if community_bills is not None:
        data["community"] = community_bills
        print(f"   Community bills: {len(community_bills)} entries")

    with open(bills_path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Updated {bills_path}")


def main():
    peek = "--peek" in sys.argv
    only = None
    for arg in sys.argv[1:]:
        if arg in ("internet", "community", "all"):
            only = arg

    print("🔑 Connecting to Google Drive...")
    drive = get_drive_service()

    if peek:
        peek_mode(drive)
        return

    internet_bills = None
    community_bills = None

    if only in (None, "all", "internet"):
        print("\n📱 Syncing phone/internet bills...")
        internet_bills = sync_internet_bills(drive)

    if only in (None, "all", "community"):
        print("\n🏠 Syncing community bills...")
        community_bills = sync_community_bills(drive)

    if internet_bills or community_bills:
        update_bills_json(internet_bills=internet_bills, community_bills=community_bills)
    else:
        print("⚠️  No bills extracted. bills.json not modified.")

    print("\n🏁 Done!")


if __name__ == "__main__":
    main()
