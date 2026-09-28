import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { PUBLIC_TAG } from "../../../lib/data";
export async function POST(request: Request) {
  const secret = process.env.CANCELDT_REVALIDATE_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    secret.length < 32 ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  revalidateTag(PUBLIC_TAG, { expire: 0 });
  return Response.json({ revalidated: true });
}
