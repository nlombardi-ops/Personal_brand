import { NextRequest, NextResponse } from "next/server";
import { generateCoverLetterPdf } from "@/lib/cv/render-cover-letter";
import { getProfile } from "@/lib/cv/profile-store";
import type { Profile } from "@/lib/types";

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text: string;
  let company: string;
  try {
    const body = await request.json();
    text = body.text;
    company = body.company;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!text?.trim() || !company?.trim()) {
    return NextResponse.json({ error: "Missing text or company" }, { status: 400 });
  }

  const profile = (await getProfile()) as Profile;
  const buffer = await generateCoverLetterPdf({
    text,
    company,
    contact: {
      name: profile.contact.name,
      email: profile.contact.email,
      phone: profile.contact.phone,
      location: profile.contact.location,
    },
  });

  const filename = `cover-letter-${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
