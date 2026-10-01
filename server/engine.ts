import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { STOCKS, type Document, type EventType, type Mode, type Signal, type Ticker } from '../shared/types';

export const MODEL_REVISION = '8f269abebfdd9009d7d9b5e96af7e5c6bfe50b20';
const round = (n: number) => Math.round(n * 1000) / 1000;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function detectTickers(text: string): Ticker[] {
  return STOCKS.filter(stock => new RegExp(`\\b${stock.ticker}\\b`).test(text) ||
    stock.aliases.some(alias => new RegExp(`\\b${escape(alias)}\\b`, 'i').test(text))).map(stock => stock.ticker);
}

const RULES: { event: EventType; base: number; pattern: RegExp }[] = [
  { event: 'Credit Event', base: 7, pattern: /\b(default(?:s|ed)?|bankrupt(?:cy)?|insolven(?:t|cy)|credit downgrade|debt restructuring|liquidity crisis)\b/gi },
  { event: 'Geopolitical', base: 6, pattern: /\b(war|invasion|sanctions?|military|geopolitical|tariffs?|trade conflict|export restrictions?|export ban)\b/gi },
  { event: 'Regulatory', base: 5, pattern: /\b(antitrust|regulator\w*|lawsuit|investigation|fine[ds]?|SEC|FTC)\b/gi },
  { event: 'Macroeconomic', base: 5, pattern: /\b(inflation|recession|interest rates?|rate cuts?|rate hikes?|central bank|Federal Reserve|unemployment|GDP)\b/gi },
  { event: 'Merger/Acquisition', base: 5, pattern: /\b(merger|acquisition|acquire[sd]?|takeover|buyout)\b/gi },
  { event: 'Earnings', base: 3, pattern: /\b(earnings|revenue|profit[s]?|quarterly results|guidance|EPS)\b/gi },
  { event: 'Product Launch', base: 3, pattern: /\b(launch\w*|unveil\w*|new product|new chip|new model|release[sd]?)\b/gi },
  { event: 'Operational', base: 4, pattern: /\b(outage|recall\w*|cyberattack|data breach|supply chain|factory|layoffs?)\b/gi },
];

export function classifyEvent(text: string, sentiment: number) {
  const matches = RULES.map(rule => ({ ...rule, terms: [...new Set((text.match(rule.pattern) ?? []).map(s => s.toLowerCase()))] }));
  const selected = matches.find(rule => rule.terms.length > 0);
  const event = selected?.event ?? 'General';
  const base = selected?.base ?? 2;
  const severe = /\b(bankrupt(?:cy)?|invasion|crisis|collapse|nationwide|massive|default(?:s|ed)?)\b/i.test(text);
  const uncertain = /\b(rumou?r|unconfirmed|might|may|could|speculat\w*)\b/i.test(text);
  const impact = Math.min(10, Math.max(1, Math.round(base + Math.abs(sentiment) * 2 + (severe ? 2 : 0) - (uncertain ? 1 : 0))));
  return { event, impact, evidence: [
    selected ? `Event cues: ${selected.terms.join(', ')}.` : 'No specific event cues; classified as general.',
    `Impact heuristic: base ${base} + sentiment intensity ${round(Math.abs(sentiment) * 2)}${severe ? ' + severity 2' : ''}${uncertain ? ' − uncertainty 1' : ''}; rounded and capped at 10.`,
  ] };
}

export function fallbackSentiment(text: string) {
  const positive = new Set(['growth', 'strong', 'surge', 'surges', 'record', 'beat', 'beats', 'gain', 'gains', 'upgrade', 'improved', 'profitable', 'exceeded', 'rally', 'bullish', 'optimistic']);
  const negative = new Set(['loss', 'losses', 'decline', 'declines', 'plunge', 'plunges', 'weak', 'miss', 'misses', 'default', 'bankruptcy', 'downgrade', 'recall', 'crisis', 'war', 'sanctions', 'lawsuit', 'outage', 'bearish', 'disappointing', 'fears', 'cuts']);
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let score = 0;
  words.forEach((word, i) => {
    let value = positive.has(word) ? 1 : negative.has(word) ? -1 : 0;
    if (words.slice(Math.max(0, i - 3), i).some(w => ['not', 'no', 'never', 'without'].includes(w))) value *= -1;
    score += value;
  });
  return round(Math.tanh(score / 2.5));
}

type Inference = (text: string) => Promise<{ label: string; score: number }[]>;
export class RiskEngine {
  status: 'loading' | 'ready' | 'fallback' = 'loading';
  error?: string;
  private infer?: Inference;
  constructor(inference?: Inference) { if (inference) { this.infer = inference; this.status = 'ready'; } }
  get info() { return { status: this.status, model: this.status === 'ready' ? 'FinBERT' : this.status === 'loading' ? 'Loading FinBERT' : 'Lexicon fallback', ...(this.error ? { error: this.error } : {}) }; }
  async initialize() {
    if (this.infer) return;
    if (process.env.NLP_MODEL === 'lexicon') { this.status = 'fallback'; return; }
    try {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.cacheDir = path.resolve('.cache/models');
      const local = path.resolve('.cache/finbert');
      const model = existsSync(path.join(local, 'onnx/model_quantized.onnx')) ? local : 'Xenova/finbert';
      const classifier = await pipeline('text-classification', model, { dtype: 'q8', device: 'cpu', revision: MODEL_REVISION });
      this.infer = async text => {
        const result = await classifier(text, { top_k: null, truncation: true, max_length: 512 });
        return result.flat() as { label: string; score: number }[];
      };
      this.status = 'ready';
    } catch (error) {
      console.error('FinBERT initialization failed:', error instanceof Error ? error.message : error);
      this.status = 'fallback';
      this.error = 'FinBERT is unavailable. A lower-quality lexicon fallback is active.';
    }
  }
  async analyze(doc: Document, mode: Mode = 'demo'): Promise<Signal> {
    const text = doc.text.replace(/\s+/g, ' ').trim();
    let probabilities: Signal['probabilities'] = null;
    let model: Signal['model'] = 'Lexicon fallback';
    let confidence: number | null = null;
    let sentiment = fallbackSentiment(text);
    if (this.infer) {
      const scores = await this.infer(text);
      const score = (label: string) => scores.find(item => item.label.toLowerCase() === label)?.score;
      const pos = score('positive'), neg = score('negative'), neu = score('neutral');
      if ([pos, neg, neu].some(x => x === undefined || !Number.isFinite(x))) throw new Error('Invalid model output');
      probabilities = { positive: round(pos!), negative: round(neg!), neutral: round(neu!) };
      sentiment = round(pos! - neg!);
      confidence = round(Math.max(pos!, neg!, neu!));
      model = 'FinBERT';
    }
    const classification = classifyEvent(text, sentiment);
    const tickers = detectTickers(text);
    return {
      ...doc, text, id: createHash('sha256').update(`${mode}:${text.toLowerCase()}`).digest('hex').slice(0, 24),
      mode, tickers, sentiment, sentimentLabel: sentiment > 0.15 ? 'positive' : sentiment < -0.15 ? 'negative' : 'neutral',
      ...classification, confidence, model, probabilities,
      evidence: [...classification.evidence, model === 'FinBERT' ? 'Sentiment = P(positive) − P(negative), using the first 512 tokens.' : 'Sentiment uses a small negation-aware word lexicon; confidence is not calibrated.',
        tickers.length ? `Company matches: ${tickers.join(', ')}. Document sentiment is shared across mentioned companies.` : 'No index company matched; this signal does not change stock weights.'],
      ingestedAt: new Date().toISOString(),
    };
  }
}
