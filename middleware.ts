import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "frilpp_session";
const LEGAL_COOKIE_NAME = "frilpp_legal";

function isProtectedPath(pathname: string) {
  return pathname === "/brand" || pathname.startsWith("/brand/") || pathname === "/influencer" || pathname.startsWith("/influencer/");
}

export function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  const legalCookie = request.cookies.get(LEGAL_COOKIE_NAME)?.value;
  if (!legalCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/legal/accept";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();

  // unreachable
}

export const config = {
  matcher: ["/brand/:path*", "/influencer/:path*"],
};
