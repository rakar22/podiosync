import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["es", "en"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/webhook") ||
    pathname === "/health" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const locale = LOCALES.find((item) => pathname === `/${item}` || pathname.startsWith(`/${item}/`));
  if (!locale) {
    const url = req.nextUrl.clone();
    url.pathname = `/es${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-locale", locale);
  requestHeaders.set("x-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-locale", locale);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
