export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`Google OAuth refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function listFilesWithToken(
  token: string,
  folderId: string,
  exts: string[]
): Promise<DriveFile[]> {
  const q = `'${folderId}' in parents and trashed = false`;
  const fields = "files(id,name,mimeType,createdTime)";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=200`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive list error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const files: DriveFile[] = [];

  for (const f of (data.files ?? []) as DriveFile[]) {
    if (f.mimeType === "application/vnd.google-apps.folder") {
      files.push(...(await listFilesWithToken(token, f.id, exts)));
    } else if (f.name) {
      const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
      if (exts.includes(ext)) files.push(f);
    }
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function downloadFileWithToken(token: string, fileId: string): Promise<Buffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive download error: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export class DriveClient {
  private token: string;

  private constructor(token: string) {
    this.token = token;
  }

  static async create(): Promise<DriveClient> {
    const token = await refreshAccessToken();
    return new DriveClient(token);
  }

  listFiles(folderId: string, exts: string[] = [".pdf", ".html", ".htm"]) {
    return listFilesWithToken(this.token, folderId, exts);
  }

  downloadFile(fileId: string) {
    return downloadFileWithToken(this.token, fileId);
  }
}
