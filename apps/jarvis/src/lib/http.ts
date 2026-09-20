// Use an explicitly configured browser origin behind the portfolio's reverse proxy.
// Forwarded host headers are not an authentication authority.
export function publicOrigin(request: Request) {
  return process.env.JARVIS_PUBLIC_ORIGIN || new URL(request.url).origin;
}

export function acceptsWrite(request: Request) {
  return (
    request.headers.get("origin") === publicOrigin(request) &&
    request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ===
      "application/json"
  );
}

export function sessionCookieOptions(request: Request) {
  return {
    httpOnly: true,
    secure: new URL(publicOrigin(request)).protocol === "https:",
    sameSite: "strict" as const,
    path: "/jarvis",
  };
}
