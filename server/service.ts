import { randomUUID } from "node:crypto";
import {
  ANALYSIS_VERSION,
  type Dashboard,
  type Document,
  type Mode,
  type Signal,
  type SourceStatus,
} from "../shared/types";
import { RiskEngine, signalId } from "./engine";
import { Store } from "./store";
import {
  equalWeights,
  holdings,
  POLICY,
  rebalance,
  validWeights,
} from "./portfolio";
import { demoDocument, SCENARIOS } from "./demo";
import { fetchSources, defaultSources, type Source } from "./sources";
import { annotateNovelty } from "./novelty";
import { ASSETS, PRESETS, runStress } from "./stress";
import type {
  StressResult,
  StressDashboard,
  PreviewResult,
} from "../shared/types";
import { documentSchema } from "./validation";

export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
export class RiskService {
  mode: Mode;
  ready = false;
  busy = false;
  private lastRefresh = 0;
  private adapters: Source[];
  private statuses: SourceStatus[];
  constructor(
    public engine: RiskEngine,
    public store: Store,
    adapters?: Source[],
  ) {
    this.mode = store.get("mode") === "demo" ? "demo" : "live";
    this.adapters = adapters ?? defaultSources;
    this.lastRefresh = Number(store.get("lastRefresh") ?? 0);
    const savedStatuses: SourceStatus[] = JSON.parse(
      store.get("sourceStatuses") ?? "[]",
    );
    this.statuses = this.adapters.map(
      (s) =>
        savedStatuses.find((saved) => saved.name === s.name) ?? {
          name: s.name,
          kind: s.kind,
          status: "idle",
          fetched: 0,
          lastFetched: null,
        },
    );
  }
  private async exclusive<T>(fn: () => Promise<T>) {
    if (this.busy) throw new ServiceError("An update is already in progress.");
    this.busy = true;
    try {
      return await fn();
    } finally {
      this.busy = false;
    }
  }
  private checkReady() {
    if (!this.ready)
      throw new ServiceError("The risk engine is still starting.", 503);
  }
  async initialize() {
    await this.engine.initialize();
    for (const mode of ["demo", "live"] as const) {
      const latest = this.store.history(mode).at(-1);
      if (!latest || !validWeights(latest.weights))
        this.store.save([], {
          id: randomUUID(),
          mode,
          timestamp: new Date().toISOString(),
          weights: equalWeights(),
          turnover: 0,
          reason: "Equal-weight starting index",
        });
    }
    if (!this.store.get("demoAnchor"))
      this.store.save([], undefined, {
        demoAnchor: String(Date.now() - 30 * 60_000),
      });
    await this.refreshAnalysis();
    this.ready = true;
  }
  private async refreshAnalysis() {
    if (this.engine.status !== "ready") return;
    const version = `${ANALYSIS_VERSION}:${this.engine.info.model}`;
    for (const mode of ["demo", "live"] as const) {
      const saved = this.store.signals(mode);
      if (saved.every((s) => s.analysisVersion === version)) continue;
      const updated: Signal[] = [];
      for (const old of saved.sort(
        (a, b) => Date.parse(a.ingestedAt) - Date.parse(b.ingestedAt),
      )) {
        const {
          text,
          sourceKind,
          sourceName,
          sourceUrl,
          publishedAt,
          isSample,
        } = old;
        const signal = await this.engine.analyze(
          { text, sourceKind, sourceName, sourceUrl, publishedAt, isSample },
          mode,
        );
        updated.push({
          ...annotateNovelty(signal, updated),
          id: old.id,
          ingestedAt: old.ingestedAt,
        });
      }
      const previous =
        this.store.history(mode).at(-1)?.weights ?? equalWeights();
      const next = rebalance(updated, previous);
      this.store.save(
        updated,
        next.turnover > 1e-6
          ? {
              ...next,
              id: randomUUID(),
              mode,
              timestamp: new Date().toISOString(),
              reason: `Recalculated with analysis ${version}`,
            }
          : undefined,
      );
    }
  }
  private async ingest(
    documents: Document[],
    mode: Mode,
    metadata: Record<string, string> = {},
  ) {
    const added: Signal[] = [],
      batch = new Set<string>();
    for (const doc of documents) {
      const parsed = documentSchema.safeParse(doc);
      if (!parsed.success) continue;
      const id = signalId(parsed.data.text, mode);
      if (this.store.has(id) || batch.has(id)) continue;
      const analyzed = await this.engine.analyze(
        { ...parsed.data, isSample: doc.isSample ?? false },
        mode,
      );
      const signal = annotateNovelty(analyzed, [
        ...this.store.signals(mode),
        ...added,
      ]);
      if (this.store.has(signal.id) || batch.has(signal.id)) continue;
      added.push(signal);
      batch.add(signal.id);
    }
    const previous = this.store.history(mode).at(-1)?.weights ?? equalWeights();
    const eligible = added.some(
      (s) =>
        !s.duplicateOf &&
        s.tickers.length &&
        Date.parse(s.publishedAt) <= Date.now() &&
        Date.now() - Date.parse(s.publishedAt) <=
          POLICY.lookbackHours * 3600000,
    );
    const decaying = !added.length && mode === "live";
    const snapshot =
      eligible || decaying
        ? {
            id: randomUUID(),
            mode,
            timestamp: new Date().toISOString(),
            ...rebalance([...this.store.signals(mode), ...added], previous),
            reason: decaying
              ? "Refresh signal decay"
              : `${added.length} new signal${added.length === 1 ? "" : "s"}`,
          }
        : undefined;
    const stressHistory = this.stress(mode).history;
    const triggered = added
      .filter(
        (s) =>
          !s.duplicateOf &&
          s.impact > 7 &&
          Date.now() - Date.parse(s.publishedAt) <= 24 * 3600000 &&
          Date.parse(s.publishedAt) <= Date.now(),
      )
      .map((s) => runStress(s.event, s.impact, mode, undefined, s));
    if (triggered.length)
      metadata[`stress:${mode}`] = JSON.stringify(
        [...triggered, ...stressHistory].slice(0, 100),
      );
    this.store.save(
      added,
      snapshot && snapshot.turnover > 1e-6 ? snapshot : undefined,
      metadata,
    );
    return added;
  }
  private async replayBatch() {
    const position = Number(this.store.get("replayPosition") ?? 0);
    if (position >= SCENARIOS.length)
      throw new ServiceError(
        "All demo scenarios have been replayed. You can still analyze your own text.",
      );
    const end = Math.min(position + 2, SCENARIOS.length),
      anchor = Number(this.store.get("demoAnchor"));
    return this.ingest(
      Array.from({ length: end - position }, (_, i) =>
        demoDocument(position + i, anchor),
      ),
      "demo",
      { replayPosition: String(end) },
    );
  }
  async replay() {
    this.checkReady();
    if (this.mode !== "demo")
      throw new ServiceError("Switch to demo mode to replay scenarios.");
    return this.exclusive(() => this.replayBatch());
  }
  async analyze(doc: Document) {
    this.checkReady();
    return this.exclusive(() => this.ingest([doc], this.mode));
  }
  async setMode(mode: Mode) {
    this.checkReady();
    return this.exclusive(async () => {
      this.store.save([], undefined, { mode });
      this.mode = mode;
      if (mode === "demo" && !this.store.get("replayPosition"))
        await this.replayBatch();
    });
  }
  stress(mode: Mode = this.mode): StressDashboard {
    return {
      assets: ASSETS,
      totalValue: ASSETS.reduce((s, a) => s + a.value, 0),
      presets: PRESETS,
      history: JSON.parse(
        this.store.get(`stress:${mode}`) ?? "[]",
      ) as StressResult[],
    };
  }
  async preview(text: string): Promise<PreviewResult> {
    this.checkReady();
    return this.exclusive(async () => {
      const previous =
        this.store.history(this.mode).at(-1)?.weights ?? equalWeights();
      const current = this.store.signals(this.mode);
      const analyzed = await this.engine.analyze(
        {
          text,
          sourceKind: "manual",
          sourceName: "What-if sandbox",
          publishedAt: new Date().toISOString(),
          isSample: true,
        },
        this.mode,
      );
      const otherSignals = current.filter((s) => s.id !== analyzed.id);
      const signal = annotateNovelty(analyzed, otherSignals);
      const combined = [...otherSignals, signal];
      const { weights, turnover } = rebalance(combined, previous);
      return {
        signal,
        holdings: holdings(combined, weights, previous),
        turnover,
        stress: runStress(signal.event, signal.impact, this.mode),
      };
    });
  }
  async refresh() {
    this.checkReady();
    if (this.mode !== "live")
      throw new ServiceError("Switch to live mode to fetch sources.");
    if (Date.now() - this.lastRefresh < 60_000)
      throw new ServiceError(
        "Live feeds can be refreshed once per minute.",
        429,
      );
    return this.exclusive(async () => {
      this.lastRefresh = Date.now();
      this.store.save([], undefined, { lastRefresh: String(this.lastRefresh) });
      const { documents, statuses } = await fetchSources(this.adapters);
      this.statuses = statuses;
      this.store.save([], undefined, {
        sourceStatuses: JSON.stringify(statuses),
      });
      return this.ingest(documents, "live");
    });
  }
  dashboard(): Dashboard {
    const signals = this.store.signals(this.mode),
      history = this.store.history(this.mode);
    return {
      mode: this.mode,
      ready: this.ready,
      busy: this.busy,
      engine: this.engine.info,
      signals,
      history: history.slice(-100),
      holdings: holdings(
        signals,
        history.at(-1)?.weights,
        history.at(-2)?.weights,
      ),
      sources:
        this.mode === "demo"
          ? ["news", "social"].map((kind) => ({
              name: kind === "news" ? "Demo Newswire" : "Demo Community",
              kind: kind as "news" | "social",
              status: "ok",
              fetched: signals.filter((s) => s.sourceKind === kind).length,
              lastFetched: signals[0]?.ingestedAt ?? null,
            }))
          : this.statuses,
      stats: {
        total: signals.length,
        sentiment: signals.length
          ? signals.reduce((sum, s) => sum + s.sentiment, 0) / signals.length
          : 0,
        highImpact: signals.filter((s) => s.impact > 7).length,
        lastUpdated:
          signals
            .map((s) => s.ingestedAt)
            .sort()
            .at(-1) ?? null,
      },
      replay: {
        position: Number(this.store.get("replayPosition") ?? 0),
        total: SCENARIOS.length,
      },
    };
  }
}
