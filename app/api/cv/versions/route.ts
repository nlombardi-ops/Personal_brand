import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { generateCvPdf } from "@/lib/cv/render";
import type { CvContent } from "@/lib/types";

export interface CvVersion {
  id: string;
  job_url: string;
  company: string;
  role_title: string;
  generated_at: string;
  cv_content: CvContent;
  pdf_path: string;
}

function readVersions(): CvVersion[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data/cv-versions.json"), "utf-8"));
  } catch {
    return [];
  }
}

function saveVersions(versions: CvVersion[]) {
  writeFileSync(join(process.cwd(), "data/cv-versions.json"), JSON.stringify(versions, null, 2));
}

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const versions = readVersions();
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
  const pdfBuffer = await generateCvPdf(content);

  const cvsDir = join(process.cwd(), "public/cvs");
  mkdirSync(cvsDir, { recursive: true });
  writeFileSync(join(cvsDir, `${id}.pdf`), pdfBuffer);

  const version: CvVersion = {
    id,
    job_url: job_url ?? "",
    company: content.meta.target_company,
    role_title: content.meta.target_role,
    generated_at: new Date().toISOString(),
    cv_content: content,
    pdf_path: `/cvs/${id}.pdf`,
  };

  const versions = readVersions();
  versions.push(version);
  saveVersions(versions);

  return NextResponse.json(version, { status: 201 });
}
