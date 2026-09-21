import { cleanSubject } from "@personal/convex/canceldt-model";
import { detail, search } from "@/lib/data";
import { searchPreview, subjectPreview } from "@/lib/metadata";
import { ogImage } from "@/lib/og-image";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug");
  const raw = params.get("q") ?? "";
  if (
    (slug !== null && (!slug || slug.length > 200)) ||
    (slug === null && (!cleanSubject(raw) || raw.length > 160))
  ) {
    return new Response("Invalid subject.", { status: 400 });
  }
  try {
    if (slug !== null) {
      const entry = await detail(slug);
      if (!entry)
        return new Response("Nothing published here.", {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        });
      return await ogImage(subjectPreview(entry));
    }
    const query = cleanSubject(raw);
    return await ogImage(searchPreview(query, await search(query)));
  } catch {
    return new Response("Couldn’t generate the preview.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
