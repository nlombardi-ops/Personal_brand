import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { put } from "@vercel/blob";
import { generateCvPdf } from "@/lib/cv/render";
import { getVersions, saveVersions } from "@/lib/cv/versions-store";
import type { CvContent, CvVersion } from "@/lib/types";

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const versions = await getVersions();
  return NextResponse.json(
    versions.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
  );
}

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, job_url }: { content: CvContent; job_url: string } = await request.json();

  const id = crypto.randomUUID();

  try {
    const pdfBuffer = await generateCvPdf(content);

    let pdf_path: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await put(`cvs/${id}.pdf`, pdfBuffer, {
        access: "private",
        contentType: "application/pdf",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      // A private blob's URL isn't directly fetchable by the browser — serve
      // it through our own proxy route instead (see [id]/pdf/route.ts).
      pdf_path = `/api/cv/versions/${id}/pdf`;
    } else {
      const cvsDir = join(process.cwd(), "public/cvs");
      mkdirSync(cvsDir, { recursive: true });
      writeFileSync(join(cvsDir, `${id}.pdf`), pdfBuffer);
      pdf_path = `/cvs/${id}.pdf`;
    }

    const version: CvVersion = {
      id,
      job_url: job_url ?? "",
      company: content.meta.target_company,
      role_title: content.meta.target_role,
      generated_at: new Date().toISOString(),
      cv_content: content,
      pdf_path,
    };

    const versions = await getVersions();
    versions.push(version);
    await saveVersions(versions);

    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save CV version: ${msg}` }, { status: 500 });
  }
}
