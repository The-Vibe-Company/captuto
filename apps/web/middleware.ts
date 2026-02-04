import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // Allow embedding for /t/[token]/embed routes
  // Remove X-Frame-Options and use CSP frame-ancestors instead (modern standard)
  if (request.nextUrl.pathname.match(/^\/t\/[^/]+\/embed$/)) {
    response.headers.delete('X-Frame-Options');
    response.headers.set('Content-Security-Policy', 'frame-ancestors *');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
