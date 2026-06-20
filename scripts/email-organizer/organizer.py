#!/usr/bin/env python3
"""
Email Attachment Organizer
Fetches emails from iCloud IMAP, downloads attachments,
and uploads them to Google Drive organized by category and month.

Handles three email patterns:
  1. Direct attachments (e.g. MasMovil energy invoices)
  2. Download links via tracking redirects (e.g. DespachoWeb "Nuevo archivo")
  3. Notification-only emails — saved as PDF snapshots (e.g. "Nuevo recibo")
"""

import imaplib
import email
import json
import re
import sys
import logging
from datetime import datetime
from email.header import decode_header
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
SCRIPT_DIR = Path(__file__).parent
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"

logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
log = logging.getLogger("organizer")

ALLOWED_EXTENSIONS = {".pdf", ".xlsx", ".xls", ".csv", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".zip"}
SKIP_LINK_KEYWORDS = {"cancelar", "unsuscribe", "unsubscribe", "baja", "preferencias"}
SKIP_LINK_DOMAINS = {"fonts.bunny.net", "fonts.googleapis.com", "play.google.com",
                     "apps.apple.com", "www.avast.com", "www.administracionescolmenarejo.es",
                     "www.piconyasociados.es", "www.aepd.es"}
FILE_CONTENT_TYPES = {"application/pdf", "application/download", "application/octet-stream",
                      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                      "application/zip"}


def load_config():
    with open(SCRIPT_DIR / "config.json") as f:
        return json.load(f)


def load_processed():
    path = SCRIPT_DIR / "processed.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {"message_ids": []}


def save_processed(data):
    with open(SCRIPT_DIR / "processed.json", "w") as f:
        json.dump(data, f, indent=2)


def get_drive_service(config):
    creds = None
    token_path = SCRIPT_DIR / config["google_token_file"]
    creds_path = SCRIPT_DIR / config["google_credentials_file"]

    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, "w") as token:
            token.write(creds.to_json())

    return build("drive", "v3", credentials=creds)


def find_or_create_folder(service, name, parent_id=None):
    query = (
        f"name = '{name}' and mimeType = 'application/vnd.google-apps.folder' "
        f"and trashed = false"
    )
    if parent_id:
        query += f" and '{parent_id}' in parents"

    results = service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]

    metadata = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent_id:
        metadata["parents"] = [parent_id]

    folder = service.files().create(body=metadata, fields="id").execute()
    log.info("Created folder: %s", name)
    return folder["id"]


def upload_file(service, file_path, folder_id, filename):
    query = f"name = '{filename}' and '{folder_id}' in parents and trashed = false"
    existing = service.files().list(q=query, spaces="drive", fields="files(id)").execute()
    if existing.get("files"):
        log.info("    Already in Drive: %s", filename)
        return existing["files"][0]["id"]

    metadata = {"name": filename, "parents": [folder_id]}
    media = MediaFileUpload(str(file_path), resumable=True)
    uploaded = service.files().create(body=metadata, media_body=media, fields="id").execute()
    log.info("    Uploaded: %s", filename)
    return uploaded["id"]


def decode_mime_header(value):
    if not value:
        return ""
    decoded_parts = decode_header(value)
    result = []
    for part, charset in decoded_parts:
        if isinstance(part, bytes):
            result.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            result.append(part)
    return "".join(result)


def get_email_date(msg):
    date_str = msg.get("Date", "")
    for fmt in (
        "%a, %d %b %Y %H:%M:%S %z",
        "%d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
    ):
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return datetime.now()


SPANISH_MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}


def extract_billing_period(subject):
    """Extract billing month from subject like 'tu factura de la luz de marzo 2026'."""
    pattern = r'(?:' + '|'.join(SPANISH_MONTHS.keys()) + r')\s+(\d{4})'
    match = re.search(pattern, subject.lower())
    if match:
        month_name = match.group(0).split()[0]
        year = int(match.group(1))
        month = SPANISH_MONTHS[month_name]
        return f"{year:04d}-{month:02d}"
    return None


def sanitize_filename(name):
    name = name.encode("utf-8").decode("utf-8", errors="replace")
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    return name.strip()


# ── Extraction strategies ──

def extract_attachments(msg, tmp_dir):
    attachments = []
    for part in msg.walk():
        cd = str(part.get("Content-Disposition", ""))
        if "attachment" not in cd:
            continue

        filename = decode_mime_header(part.get_filename())
        if not filename:
            continue

        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        filename = sanitize_filename(filename)
        filepath = tmp_dir / filename
        with open(filepath, "wb") as f:
            f.write(part.get_payload(decode=True))
        attachments.append((filename, filepath))

    return attachments


def get_html_body(msg):
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                payload = part.get_payload(decode=True)
                return payload.decode(part.get_content_charset() or "utf-8", errors="replace")
    elif msg.get_content_type() == "text/html":
        payload = msg.get_payload(decode=True)
        return payload.decode(msg.get_content_charset() or "utf-8", errors="replace")
    return ""


class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._href = dict(attrs).get("href", "")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._href:
            self.links.append((self._href, "".join(self._text).strip()))
            self._href = None
            self._text = []


def extract_filename_from_body(html_body):
    match = re.search(r'\[([^\]]+\.pdf)\]', html_body, re.IGNORECASE)
    if match:
        return sanitize_filename(match.group(1))
    match = re.search(r'(\d{4}_\d{2}_\d{2}_[^\s<>\]"]+\.pdf)', html_body, re.IGNORECASE)
    if match:
        return sanitize_filename(match.group(1))
    return None


def extract_filename_from_response(resp, html_body):
    filename = extract_filename_from_body(html_body)
    if filename:
        return filename

    cd = resp.headers.get("Content-Disposition", "")
    # Try RFC 5987 encoded filename first (filename*=UTF-8''...)
    match = re.search(r"filename\*=(?:UTF-8|utf-8)''(.+?)(?:;|$)", cd)
    if match:
        from urllib.parse import unquote
        return sanitize_filename(unquote(match.group(1)))
    # Try regular filename
    match = re.search(r'filename="?([^";]+)"?', cd)
    if match:
        raw = match.group(1).strip()
        try:
            return sanitize_filename(raw.encode("latin-1").decode("utf-8"))
        except (UnicodeDecodeError, UnicodeEncodeError):
            return sanitize_filename(raw)

    url_path = Path(urlparse(resp.url).path)
    if url_path.suffix.lower() in ALLOWED_EXTENSIONS:
        return sanitize_filename(url_path.name)

    ct = resp.headers.get("Content-Type", "")
    if "pdf" in ct:
        return "document.pdf"
    return "attachment.bin"


def try_download_link(href, html_body, tmp_dir):
    try:
        resp = requests.get(href, timeout=30, allow_redirects=True)
    except requests.RequestException as e:
        log.warning("      Failed: %s", e)
        return None

    if resp.status_code != 200:
        log.info("      Status %d, skipping", resp.status_code)
        return None

    final_domain = urlparse(resp.url).netloc
    if final_domain in SKIP_LINK_DOMAINS:
        log.info("      Redirected to %s, skipping", final_domain)
        return None

    content_type = resp.headers.get("Content-Type", "").split(";")[0].strip()
    if content_type not in FILE_CONTENT_TYPES:
        log.info("      Not a file (%s), skipping", content_type)
        return None

    filename = extract_filename_from_response(resp, html_body)
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return None

    filepath = tmp_dir / filename
    with open(filepath, "wb") as f:
        f.write(resp.content)
    log.info("      Downloaded: %s (%d KB)", filename, len(resp.content) // 1024)
    return (filename, filepath)


def extract_download_links(msg, tmp_dir):
    html_body = get_html_body(msg)
    if not html_body:
        return []

    all_hrefs = re.findall(r'href="([^"]+)"', html_body)

    results = []
    for href in all_hrefs:
        if not href.startswith("http"):
            continue

        parsed = urlparse(href)
        if parsed.netloc in SKIP_LINK_DOMAINS:
            continue

        surrounding = html_body[max(0, html_body.find(href) - 200):html_body.find(href) + len(href) + 200].lower()
        if any(kw in surrounding for kw in SKIP_LINK_KEYWORDS):
            continue

        log.info("    Trying: %s...", href[:80])
        result = try_download_link(href, html_body, tmp_dir)
        if result:
            results.append(result)

    return results


def save_email_as_html(msg, subject, email_date, tmp_dir):
    html_body = get_html_body(msg)
    if not html_body:
        return None

    date_str = email_date.strftime("%Y-%m-%d")
    safe_subject = re.sub(r'[<>:"/\\|?*]', '_', subject)[:80]
    filename = f"{date_str}_{safe_subject}.html"

    filepath = tmp_dir / filename
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html_body)
    log.info("    Saved email as: %s", filename)
    return (filename, filepath)


# ── Main processing ──

def build_sender_map(config):
    sender_map = {}
    for category, info in config["providers"].items():
        for sender in info["senders"]:
            sender_map[sender.lower()] = category
    return sender_map


def process_emails(config):
    processed = load_processed()
    sender_map = build_sender_map(config)

    if not sender_map:
        log.warning("No senders configured.")
        return

    log.info("Connecting to %s ...", config["imap_server"])
    mail = imaplib.IMAP4_SSL(config["imap_server"], config["imap_port"])
    mail.login(config["email_address"], config["app_password"])
    mail.select("INBOX")

    drive_service = get_drive_service(config)
    root_folder_id = config["drive_root_folder_id"]

    tmp_dir = SCRIPT_DIR / "tmp"
    tmp_dir.mkdir(exist_ok=True)

    total_uploaded = 0

    for sender_addr, category in sender_map.items():
        log.info("Searching: %s -> %s", sender_addr, category)

        _, msg_nums = mail.search(None, "FROM", f'"{sender_addr}"')
        if not msg_nums[0]:
            log.info("  No emails found.")
            continue

        ids = msg_nums[0].split()
        log.info("  Found %d email(s).", len(ids))

        for num in ids:
            _, data = mail.fetch(num, "(BODY.PEEK[])")
            raw = None
            for part in data:
                if isinstance(part, tuple):
                    raw = part[1]
                    break
            if not raw:
                continue

            msg = email.message_from_bytes(raw)
            message_id = msg.get("Message-ID", "").strip()
            subject = decode_mime_header(msg.get("Subject", "No Subject"))

            if not message_id:
                message_id = f"_noid_{num.decode()}_{subject}"

            if message_id in processed["message_ids"]:
                continue

            log.info("  [%s] %s", num.decode(), subject)

            email_date = get_email_date(msg)
            month_folder = extract_billing_period(subject) or email_date.strftime("%Y-%m")
            if month_folder != email_date.strftime("%Y-%m"):
                log.info("    Billing period: %s (email date: %s)", month_folder, email_date.strftime("%Y-%m"))

            # Strategy 1: direct attachments (MasMovil)
            files = extract_attachments(msg, tmp_dir)
            if files:
                log.info("    %d attachment(s)", len(files))

            # Strategy 2: download links (DespachoWeb "Nuevo archivo")
            if not files:
                files = extract_download_links(msg, tmp_dir)

            # Strategy 3: save email body as HTML snapshot (notifications)
            if not files:
                result = save_email_as_html(msg, subject, email_date, tmp_dir)
                if result:
                    files = [result]

            if not files:
                processed["message_ids"].append(message_id)
                save_processed(processed)
                continue

            category_folder_id = find_or_create_folder(drive_service, category, root_folder_id)
            month_folder_id = find_or_create_folder(drive_service, month_folder, category_folder_id)

            for filename, filepath in files:
                upload_file(drive_service, filepath, month_folder_id, filename)
                filepath.unlink()
                total_uploaded += 1

            processed["message_ids"].append(message_id)
            save_processed(processed)

    for f in tmp_dir.iterdir():
        f.unlink()
    if tmp_dir.exists():
        tmp_dir.rmdir()

    mail.logout()
    log.info("Done. Uploaded %d file(s).", total_uploaded)


def main():
    config = load_config()

    if config["email_address"].startswith("YOUR_"):
        log.error("Update config.json with your iCloud email and app password.")
        sys.exit(1)

    if not (SCRIPT_DIR / config["google_credentials_file"]).exists():
        log.error("credentials.json not found in %s", SCRIPT_DIR)
        sys.exit(1)

    process_emails(config)


if __name__ == "__main__":
    main()
