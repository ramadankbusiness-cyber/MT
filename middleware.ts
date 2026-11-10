import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/login";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (!token?.id) {
    const callbackUrl = safeReturnPath(`${request.nextUrl.pathname}${request.nextUrl.search}`);
    const loginUrl = new URL("/login", request.url);
    if (callbackUrl) loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }
  if (token.mustChangePassword && request.nextUrl.pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/attendance/:path*", "/notifications/:path*", "/profile/:path*", "/excuses/:path*"],
};
