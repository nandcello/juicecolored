import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "./convex-read";
import { api } from "@personal/convex";
export const PUBLIC_TAG = "canceldt:public";
export function convexOptions() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("CANCELDT backend is not configured.");
  return { url };
}
export async function latest() {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife({ stale: 0, revalidate: 30, expire: 60 });
  return fetchQuery(api.canceldt.public.latest, {}, convexOptions());
}
export async function detail(slug: string) {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife({ stale: 0, revalidate: 30, expire: 60 });
  return fetchQuery(api.canceldt.public.detail, { slug }, convexOptions());
}
export async function search(q: string) {
  return fetchQuery(api.canceldt.public.search, { q }, convexOptions());
}
