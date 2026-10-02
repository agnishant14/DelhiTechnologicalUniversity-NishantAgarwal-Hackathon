import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { RiskEngine } from "../server/engine";
import { Store } from "../server/store";
import { RiskService } from "../server/service";
import { createApp } from "../server/app";

let store: Store, service: RiskService;
beforeEach(async () => {
  store = new Store(":memory:");
  const engine = new RiskEngine(async () => [
    { label: "positive", score: 0.7 },
    { label: "negative", score: 0.1 },
    { label: "neutral", score: 0.2 },
  ]);
  service = new RiskService(engine, store, [
    {
      name: "News test",
      kind: "news",
      fetch: async () => [
        {
          text: "Apple announces a record profit today.",
          sourceKind: "news",
          sourceName: "News test",
          publishedAt: new Date().toISOString(),
        },
      ],
    },
    {
      name: "Social test",
      kind: "social",
      fetch: async () => {
        throw new Error("Offline");
      },
    },
  ]);
  await service.initialize();
  await service.setMode("demo");
});
afterEach(() => store.close());

describe("pipeline API", () => {
  it("exposes sentiment evaluation separately from topic metrics", async () => {
    const app = createApp(service);
    const sentiment = await request(app)
      .get("/api/model/sentiment")
      .expect(200);
    expect(sentiment.body.manifest.version).toBe("gorisk-sentiment-v2");
    expect(sentiment.body.metrics.test.count).toBe(2367);
    expect(sentiment.body.metrics.labelOrder).toEqual([
      "positive",
      "negative",
      "neutral",
    ]);
    const topic = await request(app).get("/api/model").expect(200);
    expect(topic.body).not.toHaveProperty("manifest");
  });
  it("refreshes saved analysis on upgrade without losing inputs or replaying stress history", async () => {
    const [old] = await service.analyze({
      text: "apple goes bankrupt",
      sourceKind: "manual",
      sourceName: "Saved input",
      publishedAt: new Date().toISOString(),
    });
    store.save([
      {
        ...old,
        analysisVersion: undefined,
        sentiment: 0,
        sentimentLabel: "neutral",
      },
    ]);
    const before = service.stress().history;
    const engine = new RiskEngine(async () => [
      { label: "positive", score: 0.02 },
      { label: "negative", score: 0.73 },
      { label: "neutral", score: 0.25 },
    ]);
    const restarted = new RiskService(engine, store);
    await restarted.initialize();
    const corrected = restarted
      .dashboard()
      .signals.find((s) => s.id === old.id)!;
    expect(corrected).toMatchObject({
      text: old.text,
      sourceName: old.sourceName,
      publishedAt: old.publishedAt,
      ingestedAt: old.ingestedAt,
      sentimentLabel: "negative",
      sentiment: -0.71,
    });
    expect(restarted.stress().history).toEqual(before);
    const spy = vi.spyOn(engine, "analyze");
    await restarted.initialize();
    expect(spy).not.toHaveBeenCalled();
  });
  it("uses fresh inference for an existing headline in preview without suppressing it as its own duplicate", async () => {
    const [saved] = await service.analyze({
      text: "Apple goes bankrupt after failing to repay its debts",
      sourceKind: "manual",
      sourceName: "Saved input",
      publishedAt: new Date().toISOString(),
    });
    vi.spyOn(service.engine, "analyze").mockResolvedValueOnce({
      ...saved,
      sentiment: -0.9,
      sentimentLabel: "negative",
      companySentiments: [
        {
          ticker: "AAPL",
          sentiment: -0.9,
          text: saved.text,
          scope: "shared headline",
        },
      ],
    });
    const preview = await service.preview(saved.text);
    expect(preview.signal.duplicateOf).toBeUndefined();
    expect(
      preview.holdings.find((h) => h.ticker === "AAPL")!.sentiment,
    ).toBeLessThan(0);
    expect(store.signals("demo").find((s) => s.id === saved.id)).toEqual(saved);
  });
  it("does not create automatic stress tests for negated or speculative credit events", async () => {
    await service.setMode("live");
    for (const text of [
      "Apple is not bankrupt",
      "Apple denies bankruptcy rumors",
      "Tesla may go bankrupt",
    ]) {
      await service.analyze({
        text,
        sourceKind: "manual",
        sourceName: "Test",
        publishedAt: new Date().toISOString(),
      });
    }
    expect(service.stress().history).toHaveLength(0);
  });
  it("seeds both source types and deduplicates without another rebalance", async () => {
    const before = service.dashboard();
    const analyze = vi.spyOn(service.engine, "analyze");
    expect(new Set(before.signals.map((s) => s.sourceKind))).toEqual(
      new Set(["news", "social"]),
    );
    const result = await request(createApp(service))
      .post("/api/analyze")
      .send({ text: before.signals[0].text })
      .expect(200);
    expect(result.body.added).toBe(0);
    expect(analyze).not.toHaveBeenCalled();
    expect(service.dashboard().history.length).toBe(before.history.length);
  });
  it("isolates live data, reports partial source failures, and throttles refresh", async () => {
    const app = createApp(service);
    await request(app).post("/api/mode").send({ mode: "live" }).expect(200);
    expect(service.dashboard().signals).toHaveLength(0);
    const response = await request(app).post("/api/refresh").expect(200);
    expect(response.body.added).toBe(1);
    expect(response.body.sources[1]).toMatchObject({
      status: "error",
      error: "Offline",
    });
    expect(
      service
        .dashboard()
        .signals.every((s) => s.mode === "live" && !s.isSample),
    ).toBe(true);
    await request(app).post("/api/refresh").expect(429);
    await request(app).post("/api/mode").send({ mode: "demo" }).expect(200);
    expect(service.dashboard().signals).toHaveLength(2);
  });
  it("rejects invalid payloads and exports machine-readable signals", async () => {
    const app = createApp(service);
    await request(app).post("/api/analyze").send({ text: "hi" }).expect(400);
    await request(app).post("/api/mode").send({ mode: "fake" }).expect(400);
    await request(app).get("/api/missing").expect(404);
    const result = await request(app).get("/api/export").expect(200);
    expect(result.headers["content-disposition"]).toContain("attachment");
    expect(result.body.signals).toHaveLength(2);
  });
  it("finishes replay without repeating scenarios", async () => {
    for (let i = 0; i < 2; i++) await service.replay();
    expect(service.dashboard().signals).toHaveLength(6);
    await expect(service.replay()).rejects.toThrow("All demo scenarios");
  });
  it("retains replay position across service restarts", async () => {
    await service.replay();
    const second = new RiskService(service.engine, store);
    await second.initialize();
    expect(second.dashboard().signals).toHaveLength(4);
    expect(second.dashboard().replay.position).toBe(4);
  });
  it("preserves source status and cooldown across restarts", async () => {
    await service.setMode("live");
    await service.refresh();
    const restarted = new RiskService(service.engine, store, [
      { name: "News test", kind: "news", fetch: async () => [] },
      { name: "Social test", kind: "social", fetch: async () => [] },
    ]);
    await restarted.initialize();
    expect(restarted.dashboard().mode).toBe("live");
    expect(restarted.dashboard().sources[1]).toMatchObject({
      status: "error",
      error: "Offline",
    });
    await expect(restarted.refresh()).rejects.toThrow("once per minute");
  });
  it("rejects cross-origin mutations", async () => {
    await request(createApp(service))
      .post("/api/replay")
      .set("Origin", "https://untrusted.example")
      .send({})
      .expect(403);
    expect(service.dashboard().replay.position).toBe(2);
  });
  it("serializes concurrent model updates", async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = service.engine.analyze.bind(service.engine);
    vi.spyOn(service.engine, "analyze").mockImplementationOnce(
      async (...args) => {
        await blocked;
        return original(...args);
      },
    );
    const first = service.analyze({
      text: "Apple reports a new earnings record.",
      sourceKind: "manual",
      sourceName: "Test",
      publishedAt: new Date().toISOString(),
    });
    await expect(service.replay()).rejects.toThrow("already in progress");
    release();
    await first;
    expect(service.busy).toBe(false);
  });
  it("serves measured model results and validates stress scenarios", async () => {
    const app = createApp(service);
    const model = await request(app).get("/api/model").expect(200);
    expect(model.body.trainCount).toBeGreaterThan(15000);
    expect(model.body.validationCount).toBeGreaterThan(3000);
    expect(model.body.accuracy).toBeGreaterThan(model.body.majorityAccuracy);
    await request(app)
      .post("/api/stress/simulate")
      .send({
        event: "Geopolitical",
        shocks: { equityPct: -999, ratesBps: 0, creditBps: 0, fxPct: 0 },
      })
      .expect(400);
    const test = await request(app)
      .post("/api/stress/simulate")
      .send({ event: "Geopolitical" })
      .expect(200);
    expect(test.body.before).toBe(100);
    expect(test.body.after).toBeLessThan(100);
  });
  it("persists automatic stress tests without duplicating triggers", async () => {
    await service.replay();
    const triggered = service.stress().history;
    expect(triggered.length).toBeGreaterThan(0);
    expect(
      triggered.every((s) => s.trigger === "automatic" && s.impact > 7),
    ).toBe(true);
    await service.analyze({
      text: triggered[0].headline!,
      sourceKind: "manual",
      sourceName: "Test",
      publishedAt: new Date().toISOString(),
    });
    expect(service.stress().history).toHaveLength(triggered.length);
    const restarted = new RiskService(service.engine, store);
    await restarted.initialize();
    expect(restarted.stress().history).toEqual(triggered);
  });
  it("previews a headline without changing saved signals, weights or stress history", async () => {
    const before = service.dashboard();
    const stress = service.stress();
    const result = await request(createApp(service))
      .post("/api/preview")
      .send({
        text: "Tesla faces a nationwide recall crisis and massive losses.",
      })
      .expect(200);
    expect(result.body.signal.tickers).toContain("TSLA");
    expect(result.body.holdings).toHaveLength(20);
    expect(service.dashboard().signals).toEqual(before.signals);
    expect(service.dashboard().history).toEqual(before.history);
    expect(service.stress()).toEqual(stress);
  });
  it("serves accurate stock and index quotes from tradingview", async () => {
    const res = await request(createApp(service))
      .get("/api/quotes")
      .expect(200);
    expect(res.body.source).toBe("tradingview");
    expect(res.body.stocks.NVDA).toBeDefined();
    expect(res.body.stocks.NVDA.price).toBeGreaterThan(0);
    expect(res.body.stocks.AAPL).toBeDefined();
    expect(res.body.stocks.AAPL.price).toBeGreaterThan(0);
    expect(res.body.indices.length).toBeGreaterThan(0);
  });
});
