import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith("/api/auth");
  const isCronRoute = pathname.startsWith("/api/cron");
  const isProtectedApi =
    pathname.startsWith("/api/") && !isAuthRoute && !isCronRoute;
  const isProtectedPage = /^\/(dashboard|courses|quiz|progress|profile)/.test(
    pathname
  );

  // Validate cron secret for cron routes
  if (isCronRoute) {
    const cronSecret = request.headers.get("authorization");
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Protect API routes and authenticated pages
  if ((isProtectedApi || isProtectedPage) && !token) {
    if (isProtectedApi) {
      return NextResponse.json(
        {
          error: {
            code: "AUTH_REQUIRED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      );
    }
    // Redirect unauthenticated page requests to landing page
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/courses/:path*",
    "/quiz/:path*",
    "/progress/:path*",
    "/profile/:path*",
  ],
};
