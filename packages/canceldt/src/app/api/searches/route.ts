import { after } from "next/server";
import { recordSearch } from "../../../lib/search-tracking";
import { validateQuery } from "@personal/canceldt/model";

export async function POST(request: Request) {
  let q: string;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("q" in body) || typeof body.q !== "string")
      return new Response(null, { status: 400 });
    q = validateQuery(body.q);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (q) after(() => recordSearch(q));
  return new Response(null, { status: 204 });
}
