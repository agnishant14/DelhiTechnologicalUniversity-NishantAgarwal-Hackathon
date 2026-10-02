import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { predictTopic } from "./topic";
import type { CompanySentiment, TopicPrediction } from "../shared/types";
import {
  ANALYSIS_VERSION,
  STOCKS,
  type Document,
  type EventType,
  type Mode,
  type Signal,
  type Ticker,
} from "../shared/types";

export const MODEL_REVISION = "8f269abebfdd9009d7d9b5e96af7e5c6bfe50b20";
const round = (n: number) => Math.round(n * 1000) / 1000;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function modelInput(text: string) {
  const normalized = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /[.!?]["'”’)]*$/.test(normalized) ? normalized : `${normalized}.`;
}

export function signalId(text: string, mode: Mode) {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256")
    .update(`${mode}:${normalized}`)
    .digest("hex")
    .slice(0, 24);
}

export function detectTickers(text: string): Ticker[] {
  return STOCKS.filter(
    (stock) =>
      new RegExp(
        stock.ticker.length <= 2
          ? `(?:\\$|(?:NYSE|NASDAQ):\\s*)${stock.ticker}\\b`
          : `\\b${stock.ticker}\\b`,
      ).test(text) ||
      stock.aliases.some((alias) =>
        new RegExp(`\\b${escape(alias)}\\b`, "i").test(text),
      ),
  ).map((stock) => stock.ticker);
}

const RULES: { event: EventType; base: number; pattern: RegExp }[] = [
  {
    event: "Credit Event",
    base: 7,
    pattern:
      /\b(default(?:s|ed)?|bankrupt(?:cy)?|insolven(?:t|cy)|credit downgrade|debt restructuring|liquidity crisis)\b/gi,
  },
  {
    event: "Geopolitical",
    base: 6,
    pattern:
      /\b(war|invasion|sanctions?|military|geopolitical|tariffs?|trade conflict|trade war|export restrictions?|export ban|executive order|White House|President|Pentagon|national security|missile|embargo|conflict)\b/gi,
  },
  {
    event: "Regulatory",
    base: 5,
    pattern:
      /\b(antitrust|regulator\w*|lawsuit|investigation|fine[ds]?|SEC|FTC)\b/gi,
  },
  {
    event: "Macroeconomic",
    base: 5,
    pattern:
      /\b(inflation|recession|interest rates?|rate cuts?|rate hikes?|central bank|Federal Reserve|unemployment|GDP)\b/gi,
  },
  {
    event: "Merger/Acquisition",
    base: 5,
    pattern: /\b(merger|acquisition|acquire[sd]?|takeover|buyout)\b/gi,
  },
  {
    event: "Earnings",
    base: 3,
    pattern:
      /\b(earnings|revenue|profit[s]?|quarterly results|guidance|EPS)\b/gi,
  },
  {
    event: "Product Launch",
    base: 3,
    pattern:
      /\b(launch\w*|unveil\w*|new product|new chip|new model|release[sd]?)\b/gi,
  },
  {
    event: "Operational",
    base: 4,
    pattern:
      /\b(outage|recall\w*|cyberattack|data breach|supply chain|factory|layoffs?)\b/gi,
  },
];

const TOPIC_EVENTS: Record<string, EventType> = {
  "Fed | Central Banks": "Macroeconomic",
  Macro: "Macroeconomic",
  "Legal | Regulation": "Regulatory",
  "M&A | Investments": "Merger/Acquisition",
  Financials: "Earnings",
  Earnings: "Earnings",
  Politics: "Geopolitical",
  "Personnel Change": "Operational",
};

function creditContext(text: string): Signal["creditContext"] {
  const contexts: NonNullable<Signal["creditContext"]>[] = [];
  for (const clause of text.split(
    /[.!?;]|\b(?:but|however|whereas|while)\b/i,
  )) {
    for (const match of clause.matchAll(RULES[0].pattern)) {
      const before = clause.slice(0, match.index).slice(-100);
      const after = clause.slice(
        match.index + match[0].length,
        match.index + match[0].length + 90,
      );
      const negated =
        /\b(?:not|never|no longer)\s+(?:(?:be|been|being|going|to|go|become|declared|file|for|enter|a|in|currently)\s+){0,5}$/i.test(
          before,
        ) ||
        /\b(?:no|without)\s+(?:(?:risk|signs|evidence|of|any|a)\s+){0,4}$/i.test(
          before,
        ) ||
        /\b(?:avoid(?:s|ed|ing)?|avert(?:s|ed)?|prevent(?:s|ed)?|den(?:y|ies|ied)|dismiss(?:es|ed)?|ruled? out|emerg(?:e[sd]?|ing) from|exit(?:s|ed)?)\s+(?:(?:a|the|its|any|risk|of|claims?|reports?|rumou?rs?|that|it|is|was|possible|potential)\s+){0,6}$/i.test(
          before,
        ) ||
        /^\s+(?:(?:rumou?rs?|fears?|was|is|has|have|been|were|are)\s+){0,4}(?:denied|dismissed|averted|avoided|ruled out|unfounded|false)\b/i.test(
          after,
        );
      const failedPrevention =
        /\b(?:cannot|can['’]t|could not|couldn['’]t|unable to|fail(?:s|ed)? to|not)\s+(?:avoid|avert|prevent)\b[^.!?;]*$/i.test(
          before,
        );
      const negatedDenial =
        /\b(?:not|didn['’]t|doesn['’]t)\s+(?:deny|dismiss|rule out)\b[^.!?;]*$/i.test(
          before,
        );
      const uncertain =
        negatedDenial ||
        /\b(?:may|might|could|if|risk|risks|fears?|rumou?rs?|unconfirmed|potential|possible|speculat\w*)\b/i.test(
          clause,
        );
      contexts.push(
        negated && !failedPrevention && !negatedDenial
          ? "negated or resolved"
          : uncertain
            ? "uncertain"
            : "reported",
      );
    }
  }
  return contexts.includes("reported")
    ? "reported"
    : contexts.includes("uncertain")
      ? "uncertain"
      : contexts[0];
}

export function classifyEvent(
  text: string,
  sentiment: number,
  topic?: TopicPrediction,
) {
  const credit = creditContext(text);
  const matches = RULES.map((rule) => ({
    ...rule,
    terms: [
      ...new Set((text.match(rule.pattern) ?? []).map((s) => s.toLowerCase())),
    ],
  }));
  const selected =
    matches.find(
      (rule) =>
        rule.terms.length > 0 &&
        !(rule.event === "Credit Event" && credit === "negated or resolved"),
    ) ?? matches.find((rule) => rule.terms.length > 0);
  const mapped =
    topic && !topic.needsReview ? TOPIC_EVENTS[topic.label] : undefined;
  const priority =
    selected &&
    ["Credit Event", "Geopolitical", "Operational"].includes(selected.event);
  const event =
    (priority ? selected.event : (mapped ?? selected?.event)) ?? "General";
  const base = RULES.find((r) => r.event === event)?.base ?? 2;
  const eventMethod =
    !priority && mapped ? "topic model" : selected ? "explicit cue" : "review";
  const severe =
    /\b(bankrupt(?:cy)?|invasion|crisis|collapse|nationwide|massive|default(?:s|ed)?)\b/i.test(
      credit === "negated or resolved"
        ? text.replace(RULES[0].pattern, "")
        : text,
    );
  const uncertain =
    /\b(rumou?r|unconfirmed|might|may|could|speculat\w*)\b/i.test(text);
  const rawImpact = Math.min(
    10,
    Math.max(
      1,
      Math.round(
        base + Math.abs(sentiment) * 2 + (severe ? 2 : 0) - (uncertain ? 1 : 0),
      ),
    ),
  );
  const impact =
    event === "Credit Event" && credit === "negated or resolved"
      ? Math.min(3, rawImpact)
      : event === "Credit Event" && credit === "uncertain"
        ? Math.min(7, rawImpact)
        : rawImpact;
  return {
    event,
    impact,
    ...(credit ? { creditContext: credit } : {}),
    eventMethod: eventMethod as Signal["eventMethod"],
    evidence: [
      `Event mapping: ${eventMethod}${topic ? `; learned topic: ${topic.label}` : ""}.`,
      selected
        ? `Event cues: ${selected.terms.join(", ")}.`
        : "No specific event cues; classified as general.",
      `Impact heuristic: base ${base} + sentiment intensity ${round(Math.abs(sentiment) * 2)}${severe ? " + severity 2" : ""}${uncertain ? " − uncertainty 1" : ""}; rounded and capped at 10.`,
      ...(event === "Credit Event" && credit !== "reported"
        ? [
            `Credit context: ${credit}; impact capped at ${credit === "uncertain" ? 7 : 3}. No automatic stress trigger.`,
          ]
        : []),
    ],
  };
}

export function fallbackSentiment(text: string) {
  const positive = new Set([
    "growth",
    "strong",
    "surge",
    "surges",
    "record",
    "beat",
    "beats",
    "gain",
    "gains",
    "upgrade",
    "improved",
    "profitable",
    "exceeded",
    "rally",
    "bullish",
    "optimistic",
  ]);
  const negative = new Set([
    "loss",
    "losses",
    "decline",
    "declines",
    "plunge",
    "plunges",
    "weak",
    "miss",
    "misses",
    "default",
    "bankrupt",
    "bankruptcy",
    "insolvent",
    "downgrade",
    "recall",
    "crisis",
    "war",
    "sanctions",
    "lawsuit",
    "outage",
    "bearish",
    "disappointing",
    "fears",
    "cuts",
  ]);
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let score = 0;
  words.forEach((word, i) => {
    let value = positive.has(word) ? 1 : negative.has(word) ? -1 : 0;
    if (
      words
        .slice(Math.max(0, i - 3), i)
        .some((w) => ["not", "no", "never", "without"].includes(w))
    )
      value *= -1;
    score += value;
  });
  return round(Math.tanh(score / 2.5));
}

type Inference = (text: string) => Promise<{ label: string; score: number }[]>;
export class RiskEngine {
  status: "loading" | "ready" | "fallback" = "loading";
  error?: string;
  private infer?: Inference;
  private modelVersion = `finbert-${MODEL_REVISION}-argmax-v1`;
  constructor(inference?: Inference) {
    if (inference) {
      this.infer = inference;
      this.status = "ready";
    }
  }
  get info() {
    return {
      status: this.status,
      model:
        this.status === "ready"
          ? "FinBERT"
          : this.status === "loading"
            ? "Loading FinBERT"
            : "Lexicon fallback",
      version: this.status === "ready" ? this.modelVersion : "lexicon-v1",
      ...(this.error ? { error: this.error } : {}),
    };
  }
  get analysisVersion() {
    return `${ANALYSIS_VERSION}:${this.info.model}:${this.info.version}`;
  }
  async initialize() {
    if (this.infer) return;
    if (process.env.NLP_MODEL === "lexicon") {
      this.status = "fallback";
      return;
    }
    try {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = path.resolve(".cache/models");
      const local = path.resolve(".cache/finbert");
      const model = existsSync(path.join(local, "onnx/model_quantized.onnx"))
        ? local
        : "Xenova/finbert";
      const classifier = await pipeline("text-classification", model, {
        dtype: "q8",
        device: "cpu",
        revision: MODEL_REVISION,
      });
      this.infer = async (text) => {
        const result = await classifier(text, {
          top_k: null,
          truncation: true,
          max_length: 512,
        });
        return result.flat() as { label: string; score: number }[];
      };
      this.status = "ready";
    } catch (error) {
      console.error(
        "FinBERT initialization failed:",
        error instanceof Error ? error.message : error,
      );
      this.status = "fallback";
      this.error =
        "FinBERT is unavailable. A lower-quality lexicon fallback is active.";
    }
  }
  async analyze(doc: Document, mode: Mode = "demo"): Promise<Signal> {
    const text = doc.text.replace(/\s+/g, " ").trim();
    let probabilities: Signal["probabilities"] = null;
    let model: Signal["model"] = "Lexicon fallback";
    let confidence: number | null = null;
    let sentiment = fallbackSentiment(text);
    let sentimentLabel: Signal["sentimentLabel"] =
      sentiment > 0.15
        ? "positive"
        : sentiment < -0.15
          ? "negative"
          : "neutral";
    if (this.infer) {
      const scores = await this.infer(modelInput(text));
      const score = (label: string) =>
        scores.find((item) => item.label.toLowerCase() === label)?.score;
      const pos = score("positive"),
        neg = score("negative"),
        neu = score("neutral");
      if ([pos, neg, neu].some((x) => x === undefined || !Number.isFinite(x)))
        throw new Error("Invalid model output");
      probabilities = {
        positive: round(pos!),
        negative: round(neg!),
        neutral: round(neu!),
      };
      sentiment = round(pos! - neg!);
      sentimentLabel =
        pos! >= neg! && pos! >= neu!
          ? "positive"
          : neg! >= neu!
            ? "negative"
            : "neutral";
      confidence = round(Math.max(pos!, neg!, neu!));
      model = "FinBERT";
    }
    const topic = predictTopic(text);
    const classification = classifyEvent(text, sentiment, topic);
    const tickers = detectTickers(text);
    const sentences = text.split(/(?<=[.!?;])\s+|\s+(?:while|whereas|but)\s+/i);
    const companySentiments: CompanySentiment[] = [];
    for (const ticker of tickers) {
      const scoped = sentences
        .filter((s) => {
          const matches = detectTickers(s);
          return matches.length === 1 && matches[0] === ticker;
        })
        .join(" ");
      const isolated =
        tickers.length > 1 && scoped.length > 0 && scoped !== text;
      let score = sentiment;
      if (isolated) {
        if (this.infer) {
          const output = await this.infer(modelInput(scoped));
          const positive = output.find(
            (x) => x.label.toLowerCase() === "positive",
          )?.score;
          const negative = output.find(
            (x) => x.label.toLowerCase() === "negative",
          )?.score;
          if (
            positive === undefined ||
            negative === undefined ||
            !Number.isFinite(positive - negative)
          )
            throw new Error("Invalid company sentiment output");
          score = round(positive - negative);
        } else score = fallbackSentiment(scoped);
      }
      companySentiments.push({
        ticker,
        sentiment: score,
        text: isolated ? scoped : text,
        scope: isolated ? "company sentence" : "shared headline",
      });
    }
    return {
      ...doc,
      text,
      analysisVersion: this.analysisVersion,
      ...(model === "FinBERT" ? { modelInput: modelInput(text) } : {}),
      id: signalId(text, mode),
      mode,
      tickers,
      topic,
      companySentiments,
      sentiment,
      sentimentLabel,
      ...classification,
      confidence,
      model,
      probabilities,
      evidence: [
        ...classification.evidence,
        model === "FinBERT"
          ? "Label = highest-probability class. Sentiment = P(positive) − P(negative), using the first 512 tokens."
          : "Sentiment uses a small negation-aware word lexicon; confidence is not calibrated.",
        ...(model === "FinBERT" && modelInput(text) !== text
          ? [
              "Inference uses URL-free text with normalized spacing and terminal punctuation; original source text is preserved.",
            ]
          : []),
        tickers.length
          ? `Company matches: ${tickers.join(", ")}. Separate company sentences are scored independently; shared clauses retain headline sentiment.`
          : "No index company matched; this signal does not change stock weights.",
      ],
      ingestedAt: new Date().toISOString(),
    };
  }
}
