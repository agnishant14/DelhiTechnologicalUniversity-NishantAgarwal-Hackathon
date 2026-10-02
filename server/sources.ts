import Parser from "rss-parser";
import { z } from "zod";
import type { Document, SourceStatus } from "../shared/types";
import { detectTickers } from "./engine";

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
    headers: { "User-Agent": "GoRisk-Hackathon/2.0" },
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error("Feed exceeds size limit");
  return text;
}
export const bbcNewsSource: Source = {
  name: "BBC News",
  kind: "news",
  fetch: async () => {
    const xml = await request(
      "https://feeds.bbci.co.uk/news/business/rss.xml",
    );
    const feed = await new Parser().parseString(xml);
    return feed.items.slice(0, 20).flatMap((item) => {
      const publishedAt = validDate(item.isoDate ?? item.pubDate);
      return item.title && publishedAt
        ? [
            {
              text: cleanText(item.title),
              sourceKind: "news" as const,
              sourceName: "BBC News",
              sourceUrl: item.link,
              publishedAt,
            },
          ]
        : [];
    });
  },
};

export const twitterSource: Source = {
  name: "Twitter / X Financial",
  kind: "social",
  fetch: async () => {
    const query =
      "site:twitter.com OR site:x.com (stock OR market OR Fed OR earnings OR inflation OR tariffs OR war OR Nvidia OR Apple OR Microsoft OR Tesla OR Broadcom OR JPMorgan OR Amazon)";
    const text = await request(
      `https://news.google.com/rss/search?q=${encodeURIComponent(
        query,
      )}&hl=en-US&gl=US&ceid=US:en`,
    );
    if (text.trim().startsWith("{")) {
      const raw = JSON.parse(text);
      if (raw.hits && Array.isArray(raw.hits)) {
        return raw.hits.flatMap((post: any) => {
          const publishedAt = validDate(post.created_at);
          return post.title &&
            publishedAt &&
            (detectTickers(post.title).length ||
              /\b(economy|inflation|interest rate|tariff|banking|stock market|credit|finance|war|chip|tech)\b/i.test(
                post.title,
              ))
            ? [
                {
                  text: cleanText(post.title).replace(
                    /\s*-\s*(x\.com|twitter)\s*$/i,
                    "",
                  ),
                  sourceKind: "social" as const,
                  sourceName: "Twitter / X Financial",
                  sourceUrl:
                    post.url ??
                    `https://news.ycombinator.com/item?id=${encodeURIComponent(post.objectID)}`,
                  publishedAt,
                },
              ]
            : [];
        });
      }
    }
    const feed = await new Parser().parseString(text);
    return feed.items.slice(0, 20).flatMap((item) => {
      const publishedAt = validDate(item.isoDate ?? item.pubDate);
      if (!item.title || !publishedAt) return [];
      const cleaned = cleanText(item.title).replace(
        /\s*-\s*(x\.com|twitter)\s*$/i,
        "",
      );
      return [
        {
          text: cleaned,
          sourceKind: "social" as const,
          sourceName: "Twitter / X Financial",
          sourceUrl: item.link ?? "https://x.com",
          publishedAt,
        },
      ];
    });
  },
};

export const presidentialWarSource: Source = {
  name: "Presidential & Geopolitical Risk",
  kind: "news",
  fetch: async () => {
    const query =
      '(President OR "White House" OR tariffs OR sanctions OR war OR Pentagon OR "executive order" OR military) (economy OR markets OR defense OR trade OR chips OR energy)';
    const xml = await request(
      `https://news.google.com/rss/search?q=${encodeURIComponent(
        query,
      )}&hl=en-US&gl=US&ceid=US:en`,
    );
    const feed = await new Parser().parseString(xml);
    return feed.items.slice(0, 20).flatMap((item) => {
      const publishedAt = validDate(item.isoDate ?? item.pubDate);
      return item.title && publishedAt
        ? [
            {
              text: cleanText(item.title),
              sourceKind: "news" as const,
              sourceName: "Presidential & Geopolitical Risk",
              sourceUrl: item.link,
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

export const sources: Source[] = [
  bbcNewsSource,
  twitterSource,
  yahooFinanceSource,
  presidentialWarSource,
];

export const defaultSources: Source[] = [
  bbcNewsSource,
  twitterSource,
  yahooFinanceSource,
  presidentialWarSource,
  ...(process.env.NEWS_SOURCE === "gdelt" ? [gdeltSource] : []),
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
