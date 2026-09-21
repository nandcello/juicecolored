import { describe, expect, it } from "vitest";
import { previewMetadata, previewTitle, searchPreview, subjectPreview } from "../src/lib/metadata";
import { publicPath, searchPath, subjectPath } from "../src/lib/share";

const entry = {
  subject: "Fictional Café",
  slug: "fictional-café",
  oneLineReason: "A fictional headline.",
};

describe("share previews", () => {
  it("uses the stored subject and headline for an exact match", () => {
    const preview = searchPreview("FICTIONAL CAFÉ", { exact: entry, matches: [] });
    expect(preview).toEqual(subjectPreview(entry));
    expect(previewTitle(preview)).toBe("Fictional Café is cancelled.");
  });

  it("does not describe an ambiguous search as not cancelled", () => {
    const preview = searchPreview("Fictional", { exact: null, matches: [entry] });
    expect(preview.status).toBe("matches");
    expect(previewTitle(preview)).toBe("Matching subjects for Fictional");
    expect(searchPreview("Absent", { exact: null, matches: [] }).status).toBe("unlisted");
  });

  it("encodes query text and Unicode slugs once, with the app base path", () => {
    const query = "Café & tea? #1 / 100%";
    const path = publicPath(searchPath(query));
    expect(new URL(path, "https://example.com").searchParams.get("q")).toBe(query);
    expect(publicPath(subjectPath(entry.slug))).toBe("/canceldt/subject/fictional-caf%C3%A9");
    expect(publicPath("/")).toBe("/canceldt");
  });

  it("gives records canonical URLs and subject-specific OG and Twitter images", () => {
    const metadata = previewMetadata(subjectPreview(entry), { slug: entry.slug });
    expect(metadata.description).toBe(entry.oneLineReason);
    expect(metadata.alternates?.canonical).toMatch(/\/canceldt\/subject\/fictional-caf%C3%A9$/);
    expect(metadata.openGraph?.images).toEqual(metadata.twitter?.images);
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: expect.stringMatching(/\/canceldt\/api\/og\?slug=fictional-caf%C3%A9$/),
        width: 1200,
        height: 630,
      }),
    ]);
  });
});
