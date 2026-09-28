import { NextResponse, type NextRequest } from "next/server";

// A router-level 404 has no route params. Pass only the document's area so it can
// select the original error UI without maintaining a second list of valid routes.
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const area = /^\/jarvis(?:\/|$)/.test(pathname)
    ? "jarvis"
    : /^\/canceldt(?:\/|$)/.test(pathname)
      ? "canceldt"
      : "portfolio";
  const headers = new Headers(request.headers);
  headers.set("x-personal-area", area);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
