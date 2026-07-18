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

async function findOrCreateFolderWithToken(token: string, name: string, parentId = "root"): Promise<string> {
  const q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent("files(id,name)")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive folder lookup error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const existing = ((data.files ?? []) as Array<{ id: string }>)[0];
  if (existing) return existing.id;

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  if (!createRes.ok) throw new Error(`Drive folder create error: ${createRes.status} ${await createRes.text()}`);
  const created = await createRes.json();
  return created.id as string;
}

async function uploadFileWithToken(
  token: string,
  name: string,
  mimeType: string,
  data: Buffer,
  parentId: string
): Promise<string> {
  const boundary = `cvupload-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name, parents: [parentId] });
  const preamble = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;
  const body = Buffer.concat([Buffer.from(preamble, "utf-8"), data, Buffer.from(closing, "utf-8")]);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload error: ${res.status} ${await res.text()}`);
  const created = await res.json();
  return created.id as string;
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

  findOrCreateFolder(name: string, parentId?: string) {
    return findOrCreateFolderWithToken(this.token, name, parentId);
  }

  uploadFile(name: string, mimeType: string, data: Buffer, parentId: string) {
    return uploadFileWithToken(this.token, name, mimeType, data, parentId);
  }
}
