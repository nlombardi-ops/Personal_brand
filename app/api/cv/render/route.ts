import { NextRequest, NextResponse } from "next/server";
import { generateCvPdf } from "@/lib/cv/render";
import type { CvContent } from "@/lib/types";

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

  const buffer = await generateCvPdf(content);

  const filename = `cv-${content.meta.target_company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
