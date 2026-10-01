import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSources, gdeltSource, sources } from "../server/sources";

afterEach(() => vi.unstubAllGlobals());
describe("source adapters", () => {
  it("parses RSS headlines with safe timestamps and provenance", async () => {
    const date = new Date().toUTCString();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            `<rss version="2.0"><channel><title>News</title><item><title>Apple earnings &amp; growth</title><link>https://example.com/story</link><pubDate>${date}</pubDate></item><item><title>Undated story</title></item></channel></rss>`,
          ),
        ),
    );
    const docs = await sources[0].fetch();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      text: "Apple earnings & growth",
      sourceKind: "news",
      sourceUrl: "https://example.com/story",
    });
  });
  it("parses community posts and drops absent titles", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            hits: [
              {
                objectID: "123",
                title: "NVIDIA launches a new chip",
                created_at: new Date().toISOString(),
              },
              {
                objectID: "124",
                title: null,
                created_at: new Date().toISOString(),
              },
            ],
          }),
        ),
      ),
    );
    const docs = await sources[1].fetch();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      sourceKind: "social",
      sourceUrl: "https://news.ycombinator.com/item?id=123",
    });
  });
  it("normalizes GDELT observation timestamps", async () => {
    const date = new Date(Date.now() - 10000)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "Z");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              articles: [
                {
                  title: "Tesla earnings",
                  url: "https://example.com/tesla",
                  seendate: date,
                },
              ],
            }),
          ),
        ),
    );
    const docs = await gdeltSource.fetch();
    expect(docs).toHaveLength(1);
    expect(Number.isFinite(Date.parse(docs[0].publishedAt))).toBe(true);
  });
  it("reports failures without manufacturing live records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })),
    );
    const result = await fetchSources(sources);
    expect(result.documents).toHaveLength(0);
    expect(result.statuses.every((s) => s.status === "error")).toBe(true);
  });
});
