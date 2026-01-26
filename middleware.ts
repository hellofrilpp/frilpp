import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "frilpp_session";
const LEGAL_COOKIE_NAME = "frilpp_legal";
const LANE_COOKIE_NAME = "frilpp_lane";

const BRAND_PUBLIC_PATHS = new Set(["/brand/auth", "/brand/login", "/brand/signup"]);
const CREATOR_PUBLIC_PATHS = new Set([
  "/influencer/auth",
  "/influencer/login",
  "/influencer/signup",
]);

function isProtectedPath(pathname: string) {
  if (BRAND_PUBLIC_PATHS.has(pathname) || CREATOR_PUBLIC_PATHS.has(pathname)) {
    return false;
  }
  return pathname === "/brand" || pathname.startsWith("/brand/") || pathname === "/influencer" || pathname.startsWith("/influencer/");
}

function authRedirect(pathname: string) {
  return pathname.startsWith("/brand") ? "/brand/auth" : "/influencer/auth";
}

export function middleware(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = authRedirect(request.nextUrl.pathname);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  const legalCookie = request.cookies.get(LEGAL_COOKIE_NAME)?.value;
  if (!legalCookie) {
    if (request.nextUrl.pathname.startsWith("/brand/setup")) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/legal/accept";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  const lane = request.cookies.get(LANE_COOKIE_NAME)?.value;
  if (lane === "brand" && request.nextUrl.pathname.startsWith("/influencer")) {
    const url = request.nextUrl.clone();
    url.pathname = "/brand/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (lane === "creator" && request.nextUrl.pathname.startsWith("/brand")) {
    const url = request.nextUrl.clone();
    url.pathname = "/influencer/discover";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();

  // unreachable
}

export const config = {
  matcher: ["/brand/:path*", "/influencer/:path*"],
};
