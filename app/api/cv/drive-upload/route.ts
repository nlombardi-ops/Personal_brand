import { NextRequest, NextResponse } from "next/server";
import { generateCvPdf } from "@/lib/cv/render";
import { DriveClient } from "@/lib/drive/client";
import type { CvContent } from "@/lib/types";

const CVS_FOLDER_NAME = "CVs";

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let content: CvContent;
  try {
    const body = await request.json();
    content = body.content as CvContent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!content?.about) {
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    return NextResponse.json({ error: "Google Drive is not configured" }, { status: 500 });
  }

  try {
    const buffer = await generateCvPdf(content);
    const drive = await DriveClient.create();
    const folderId = await drive.findOrCreateFolder(CVS_FOLDER_NAME);

    const date = new Date().toISOString().slice(0, 10);
    const company = content.meta.target_company.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const role = content.meta.target_role.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `cv-${company}-${role}-${date}.pdf`;

    const fileId = await drive.uploadFile(filename, "application/pdf", buffer, folderId);

    return NextResponse.json({ uploaded: true, fileId, filename });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Drive upload failed: ${msg}` }, { status: 500 });
  }
}
