import Parser from "rss-parser";
import { z } from "zod";
import type { Document, SourceStatus } from "../shared/types";

export interface Source {
  name: string;
  kind: "news" | "social";
  fetch: () => Promise<Document[]>;
}
export const cleanText = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
const validDate = (value?: string) => {
  const ms = value ? Date.parse(value) : NaN;
  return Number.isFinite(ms) && ms <= Date.now() + 300_000
    ? new Date(ms).toISOString()
    : null;
};
async function request(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "SignalDesk-Hackathon/1.0" },
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error("Feed exceeds size limit");
  return text;
}
export const sources: Source[] = [
  {
    name: "Google News RSS",
    kind: "news",
    fetch: async () => {
      const query =
        "(Apple OR Microsoft OR Nvidia OR Tesla OR Amazon OR JPMorgan) (earnings OR stock OR revenue) when:1d";
      const xml = await request(
        `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
      );
      const feed = await new Parser().parseString(xml);
      return feed.items.slice(0, 20).flatMap((item) => {
        const publishedAt = validDate(item.isoDate ?? item.pubDate);
        return item.title && publishedAt
          ? [
              {
                text: cleanText(item.title),
                sourceKind: "news" as const,
                sourceName: "Google News RSS",
                sourceUrl: item.link,
                publishedAt,
              },
            ]
          : [];
      });
    },
  },
  {
    name: "Hacker News",
    kind: "social",
    fetch: async () => {
      const cutoff = Math.floor(Date.now() / 1000) - 86400;
      const raw = JSON.parse(
        await request(
          `https://hn.algolia.com/api/v1/search_by_date?query=Nvidia&tags=story&numericFilters=created_at_i%3E${cutoff}&hitsPerPage=20`,
        ),
      );
      const parsed = z
        .object({
          hits: z.array(
            z.object({
              objectID: z.string(),
              title: z.string().nullable(),
              created_at: z.string(),
            }),
          ),
        })
        .parse(raw);
      return parsed.hits.flatMap((post) => {
        const publishedAt = validDate(post.created_at);
        return post.title && publishedAt
          ? [
              {
                text: cleanText(post.title),
                sourceKind: "social" as const,
                sourceName: "Hacker News",
                sourceUrl: `https://news.ycombinator.com/item?id=${encodeURIComponent(post.objectID)}`,
                publishedAt,
              },
            ]
          : [];
      });
    },
  },
];
export const gdeltSource: Source = {
  name: "GDELT",
  kind: "news",
  fetch: async () => {
    const query =
      "(Apple OR Microsoft OR Nvidia OR Tesla OR Amazon) sourcelang:english";
    const raw = JSON.parse(
      await request(
        `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=20&timespan=24h&sort=datedesc`,
      ),
    );
    const parsed = z
      .object({
        articles: z.array(
          z.object({ title: z.string(), url: z.url(), seendate: z.string() }),
        ),
      })
      .parse(raw);
    return parsed.articles.flatMap((article) => {
      const date = article.seendate.replace(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
        "$1-$2-$3T$4:$5:$6Z",
      );
      const publishedAt = validDate(date);
      return publishedAt
        ? [
            {
              text: cleanText(article.title),
              sourceKind: "news" as const,
              sourceName: "GDELT",
              sourceUrl: article.url,
              publishedAt,
            },
          ]
        : [];
    });
  },
};

export const yahooFinanceSource: Source = {
  name: "Yahoo Finance",
  kind: "news",
  fetch: async () => {
    const xml = await request("https://finance.yahoo.com/news/rssindex");
    const feed = await new Parser().parseString(xml);
    return feed.items.slice(0, 20).flatMap((item) => {
      const publishedAt = validDate(item.isoDate ?? item.pubDate);
      return item.title && publishedAt
        ? [
            {
              text: cleanText(item.title),
              sourceKind: "news" as const,
              sourceName: "Yahoo Finance",
              sourceUrl: item.link,
              publishedAt,
            },
          ]
        : [];
    });
  },
};

export const defaultSources: Source[] = [
  sources[0],
  sources[1],
  gdeltSource,
  yahooFinanceSource,
];
export async function fetchSources(adapters: Source[]) {
  const results = await Promise.allSettled(
    adapters.map((source) => source.fetch()),
  );
  const documents: Document[] = [],
    statuses: SourceStatus[] = [];
  results.forEach((result, i) => {
    const source = adapters[i],
      timestamp = new Date().toISOString();
    if (result.status === "fulfilled") {
      documents.push(...result.value);
      statuses.push({
        name: source.name,
        kind: source.kind,
        status: "ok",
        fetched: result.value.length,
        lastFetched: timestamp,
      });
    } else
      statuses.push({
        name: source.name,
        kind: source.kind,
        status: "error",
        fetched: 0,
        lastFetched: timestamp,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Source unavailable",
      });
  });
  return { documents, statuses };
}
