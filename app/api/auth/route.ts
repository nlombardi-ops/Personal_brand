import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correct = process.env.DASHBOARD_PASSWORD;

  if (!correct || password !== correct) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Generate a simple token and set it as cookie
  const token = process.env.DASHBOARD_TOKEN || crypto.randomUUID();

  const response = NextResponse.json({ success: true });
  response.cookies.set("dashboard_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("dashboard_auth");
  return response;
}
