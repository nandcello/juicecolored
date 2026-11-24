import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * The share card for /concepts/cuppy, as social crawlers see it: the server
 * HTML only (no script runs), checked against the PNG and alt text in this
 * checkout. The canonical production host is resolved to the server under
 * test, so the card is verified before it is released.
 */
const PAGE = "/concepts/cuppy";
const CANONICAL = "https://juicecolored.com/concepts/cuppy";
const CARD_DIR = resolve(import.meta.dirname, "../../src/app/(cuppy)/concepts/cuppy");
const CARD_FILE = resolve(CARD_DIR, "opengraph-image.png");
/** Next copies the alt file verbatim, so it must not end in a newline. */
const cardAlt = () => readFileSync(resolve(CARD_DIR, "opengraph-image.alt.txt"), "utf8");

const CRAWLERS = {
  facebook: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  twitter: "Twitterbot/1.0",
  slack: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
};

/** Attributes of every <meta> and <link> in the server-rendered <head>. */
async function headTags(request: APIRequestContext, path: string, userAgent: string) {
  const response = await request.get(path, { headers: { "user-agent": userAgent } });
  expect(response.status()).toBe(200);
  const html = await response.text();
  const end = html.indexOf("</head>");
  expect(end).toBeGreaterThan(0);
  const head = html.slice(0, end);
  const tags = [...head.matchAll(/<(meta|link)\s([^>]*?)\/?>/g)].map(([, name, attrs]) => {
    const parsed: Record<string, string> = { tag: name };
    for (const [, key, value] of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) {
      parsed[key] = value.replaceAll("&amp;", "&");
    }
    return parsed;
  });
  const all = (key: string) =>
    tags.filter((t) => t.property === key || t.name === key).map((t) => t.content);
  const one = (key: string) => {
    const values = all(key);
    expect(values, key).toHaveLength(1);
    return values[0];
  };
  return { html, head, tags, all, one };
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  expect(bytes.subarray(12, 16).toString("latin1")).toBe("IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Fetches a production URL from the server under test. */
async function getLocal(request: APIRequestContext, absolute: string) {
  const url = new URL(absolute);
  expect(url.origin).toBe("https://juicecolored.com");
  return request.get(url.pathname + url.search);
}

test("Cuppy serves its own share card to social crawlers from server HTML", async ({ request }) => {
  for (const [name, userAgent] of Object.entries(CRAWLERS)) {
    const { head, tags, one } = await headTags(request, PAGE, userAgent);

    expect(head, name).toContain("<title>Cuppy — The scoop that stretches (concept)</title>");
    expect(tags.find((t) => t.rel === "canonical")?.href, name).toBe(CANONICAL);
    expect(one("robots"), name).toBe("noindex, nofollow");

    expect(one("og:url"), name).toBe(CANONICAL);
    expect(one("og:type"), name).toBe("website");
    expect(one("og:title"), name).toBe("Cuppy — The scoop that stretches (concept)");
    const image = one("og:image");
    expect(image, name).toMatch(
      /^https:\/\/juicecolored\.com\/concepts\/cuppy\/opengraph-image(-\w+)?\.png(\?\w+)?$/,
    );
    expect(one("og:image:type"), name).toBe("image/png");
    expect(one("og:image:width"), name).toBe("1200");
    expect(one("og:image:height"), name).toBe("630");
    const alt = cardAlt();
    expect(alt.trim(), "alt text has no stray whitespace").toBe(alt);
    expect(alt.length).toBeGreaterThan(40);
    expect(one("og:image:alt"), name).toBe(alt);

    // X/Twitter gets the large card and the very same asset.
    expect(one("twitter:card"), name).toBe("summary_large_image");
    expect(one("twitter:image"), name).toBe(image);
    expect(one("twitter:image:alt"), name).toBe(alt);
    expect(one("twitter:title"), name).toBe("Cuppy — The scoop that stretches (concept)");

    const card = readFileSync(CARD_FILE);
    expect(pngSize(card)).toEqual({ width: 1200, height: 630 });
    const served = await getLocal(request, image);
    expect(served.status(), name).toBe(200);
    expect(served.headers()["content-type"], name).toBe("image/png");
    const bytes = await served.body();
    expect(bytes.equals(card), `${name}: served card matches the checkout`).toBe(true);
    expect(pngSize(bytes)).toEqual({ width: 1200, height: 630 });
  }
});

test("the old /cuppy entry still redirects exactly, without its own card", async ({ request }) => {
  for (const old of ["/cuppy", "/cuppy/"]) {
    const response = await request.get(old, {
      maxRedirects: 0,
      headers: { "user-agent": CRAWLERS.facebook },
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(PAGE);
  }
});

test("the homepage keeps its own share card and never uses Cuppy's", async ({ request }) => {
  for (const userAgent of [CRAWLERS.facebook, CRAWLERS.twitter]) {
    const { head, one, all } = await headTags(request, "/", userAgent);
    expect(head).not.toMatch(/cuppy/i);
    expect(one("og:url")).toBe("https://juicecolored.com");
    expect(all("og:image")).toEqual([
      "https://u87gtvu295.ufs.sh/f/mqA1Bp30wBSQORFFqRGdzqpZveMfBuro8yLwXgIcQ9YsF2PU",
    ]);
    expect(one("twitter:image")).toBe(all("og:image")[0]);
  }
});
