import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge middleware only checks for the presence of a session cookie and bounces
// unauthenticated visitors to /login. Full token verification + the
// subscription check happen in the Node runtime (dashboard layout), because
// HMAC verification and the data store aren't available on the edge.

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get("nrm_session")?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
