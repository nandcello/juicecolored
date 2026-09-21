import { latest, detail, search } from "@/lib/data";
import { socialImage } from "@/lib/metadata";
import { cleanSubject } from "@personal/convex/canceldt-model";
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
const report = (subject: string) => `/canceldt/report?subject=${encodeURIComponent(subject)}`;
// A complete HTML response for native form submissions. Streaming React shells
// require JS to reveal suspended content; this fallback does not stream.
export async function GET(request: Request) {
  const url = new URL(request.url),
    raw = url.searchParams.get("q") ?? "",
    q = cleanSubject(raw);
  const slug = url.searchParams.get("slug");
  let body = "",
    status = 200;
  try {
    if (raw.length > 160) {
      body =
        '<h1>Check not run.</h1><p role="alert">Use 160 characters or fewer for the subject.</p>';
      status = 400;
    } else if (slug) {
      const entry = await detail(slug);
      if (!entry) {
        body = "<h1>Nothing published here.</h1>";
        status = 404;
      } else
        body = `<h1>${escape(entry.subject)}</h1><p>${escape(entry.oneLineReason)}</p>${entry.description ? `<div class="description">${escape(entry.description)}</div>` : ""}${entry.sources.length ? `<h2>Sources</h2><ul>${entry.sources.map((source) => `<li><a href="${escape(source.url)}" rel="noopener noreferrer">${escape(source.title || new URL(source.url).hostname)}</a></li>`).join("")}</ul>` : ""}<p><a href="${report(entry.subject)}">Something wrong? Submit a correction.</a></p>`;
    } else {
      const result = q ? await search(q) : null;
      if (result?.exact)
        body = `<h1>${escape(result.exact.subject)} is cancelled.</h1><p>${escape(result.exact.oneLineReason)}</p><a href="/canceldt/lookup?slug=${encodeURIComponent(result.exact.slug)}">${result.exact.hasDetails ? "The deets →" : "View record →"}</a><p class="quiet">An entry in CANCELDT’s curated published list.</p>`;
      else if (result && !result.matches.length)
        body = `<h1>${escape(q)} is not cancelled.</h1><p>No entry in CANCELDT’s published list.</p><a href="${report(q)}">Should be cancelled? Report it.</a>`;
      else {
        const entries = result?.matches ?? (await latest());
        body = `<h1>${q ? "Matching subjects" : "LATEST CANCELS"}</h1>${entries.length ? `<ol>${entries.map((entry) => `<li><h2>${escape(entry.subject)}</h2><p>${escape(entry.oneLineReason)}</p><small>${new Date(entry.publishedAt).toISOString().slice(0, 10)}</small><p><a href="/canceldt/lookup?slug=${encodeURIComponent(entry.slug)}">${entry.hasDetails ? "The deets →" : "View record →"}</a></p></li>`).join("")}</ol>` : "<p>No cancels. Yet.</p>"}`;
      }
    }
  } catch {
    status = 503;
    body =
      '<h1>Couldn’t check the list.</h1><p role="alert">The check could not be completed. Please try again.</p><a href="/canceldt/lookup">Retry →</a>';
  }
  const canonical = slug
    ? `/canceldt/subject/${encodeURIComponent(slug)}`
    : q
      ? `/canceldt?q=${encodeURIComponent(q)}`
      : "/canceldt";
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CANCELDT. — Search</title><meta property="og:image" content="${socialImage.url}"><meta property="og:image:width" content="${socialImage.width}"><meta property="og:image:height" content="${socialImage.height}"><meta property="og:image:alt" content="${socialImage.alt}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${socialImage.url}"><meta name="twitter:image:alt" content="${socialImage.alt}"><link rel="canonical" href="${escape(canonical)}"><meta name="robots" content="noindex"><style>body{background:#f7f6f2;color:#181817;font:17px/1.5 Arial,sans-serif;max-width:900px;margin:auto;padding:28px}a{color:inherit;text-underline-offset:4px}header{margin-bottom:32px}.wordmark{font:900 clamp(55px,10vw,100px)/1 Impact,'Arial Narrow',sans-serif;letter-spacing:-.03em;display:block;margin-top:24px;text-decoration:none}h1{font:900 clamp(35px,7vw,70px)/1.05 Impact,'Arial Narrow',sans-serif;overflow-wrap:anywhere}h2{font-size:28px;margin:0}label{display:block}input,button{font:inherit;padding:12px;border:1px solid #181817;background:transparent;max-width:100%;box-sizing:border-box}button{background:#181817;color:white}form{display:flex;gap:10px;flex-wrap:wrap;margin:15px 0 35px}input{flex:1;min-width:0}ol{list-style:none;padding:0}li{border-top:1px solid #ccc;padding:20px 0}.description{white-space:pre-wrap}.quiet,small,footer{color:#65635f;font-size:13px}footer{margin-top:60px;border-top:1px solid #ccc;padding-top:20px}:focus-visible{outline:3px solid #c82c27;outline-offset:3px}</style></head><body><header><a href="/">← juicecolored</a><a href="/canceldt/lookup" class="wordmark">CANCELDT.</a></header><main><label for="q">Who or what?</label><form action="/canceldt/lookup" method="get"><input id="q" name="q" type="search" maxlength="160" value="${escape(q.slice(0, 160))}"><button>Check →</button><a href="/canceldt/lookup">Clear</a></form>${body}</main><footer>A curated list. Not universal consensus. · <a href="${escape(canonical)}">Standard view</a></footer></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      },
    },
  );
}
