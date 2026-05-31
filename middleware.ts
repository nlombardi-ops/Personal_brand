import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /dashboard routes (not /dashboard/login)
  if (pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/login")) {
    const token = request.cookies.get("dashboard_auth")?.value;
    if (token !== process.env.DASHBOARD_TOKEN) {
      const loginUrl = new URL("/dashboard/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
