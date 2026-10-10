import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_ROUTES = ["/login", "/signup", "/reset-password"];

function matches(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Carry refreshed Supabase auth cookies onto a redirect response. */
function redirectWithCookies(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  const cookies = from.headers.getSetCookie?.() ?? [];
  cookies.forEach((cookie) => redirect.headers.append("set-cookie", cookie));
  return redirect;
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // Signed-out users may only reach the public auth + callback routes.
  const isPublic =
    matches(pathname, AUTH_ROUTES) ||
    pathname === "/auth/callback" ||
    pathname === "/update-password";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(url, response);
  }

  // Signed-in users shouldn't see the login/signup/reset screens.
  if (user && matches(pathname, AUTH_ROUTES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimisation.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
