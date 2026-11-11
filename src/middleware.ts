import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { getTenantSlugFromHost } from "@/lib/tenant/host";

export default auth((request: NextRequest & { auth?: { user?: { id?: string } } }) => {
  const { nextUrl } = request;
  const tenantSlug = getTenantSlugFromHost(request.headers.get("host"));

  if (tenantSlug && !nextUrl.pathname.startsWith("/w/") && !nextUrl.pathname.startsWith("/api")) {
    const rewrittenUrl = new URL(`/w/${tenantSlug}${nextUrl.pathname}`, nextUrl.origin);
    rewrittenUrl.search = nextUrl.search;
    return NextResponse.rewrite(rewrittenUrl);
  }

  const isProtectedRoute = nextUrl.pathname.startsWith("/w/") || nextUrl.pathname === "/onboarding";
  const isAuthRoute = nextUrl.pathname === "/login" || nextUrl.pathname === "/register";

  if (isProtectedRoute && !request.auth?.user?.id) {
    const redirectUrl = new URL("/login", nextUrl.origin);
    redirectUrl.searchParams.set("redirectTo", `${nextUrl.pathname}${nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && request.auth?.user?.id) {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
