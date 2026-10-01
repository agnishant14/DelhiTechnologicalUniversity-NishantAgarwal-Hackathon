import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { RiskService, ServiceError } from "./service";
import { documentSchema } from "./validation";
import financialDatasetRaw from "../data/financial_dataset.json";
import type { DatasetItem, DatasetQueryResponse } from "../shared/types";
import {
  computeCreditRatings,
  computeContagion,
  computeValueAtRisk,
  simulateWhatIf,
} from "./riskAnalytics";

export function createApp(service: RiskService) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (req, res, next) => {
    const origin = req.get("origin");
    if (origin && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      try {
        if (new URL(origin).hostname !== req.hostname) {
          res
            .status(403)
            .json({ error: "Cross-origin updates are not allowed" });
          return;
        }
      } catch {
        res.status(403).json({ error: "Invalid origin" });
        return;
      }
    }
    next();
  });
  app.use(express.json({ limit: "128kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", (_req, res) =>
    res.json({
      status: service.ready ? "ok" : "starting",
      engine: service.engine.info,
    }),
  );
  app.get("/api/dashboard", (_req, res) => res.json(service.dashboard()));
  app.get("/api/signals", (_req, res) => res.json(service.dashboard().signals));
  app.get("/api/market-flow", (_req, res) => res.json(service.marketFlow()));
  app.get("/api/credit-ratings", (_req, res) => {
    const signals = service.dashboard().signals;
    res.json(computeCreditRatings(signals));
  });
  app.get("/api/contagion", (_req, res) => {
    const signals = service.dashboard().signals;
    res.json(computeContagion(signals));
  });
  app.get("/api/var", (_req, res) => {
    const signals = service.dashboard().signals;
    res.json(computeValueAtRisk(signals));
  });
  app.post("/api/simulate-what-if", async (req, res) => {
    const { text } = z
      .object({ text: z.string().min(3).max(6000) })
      .parse(req.body);
    const result = await simulateWhatIf(
      text,
      service.engine,
      service.dashboard().holdings,
    );
    res.json(result);
  });
  app.get("/api/dataset", (req, res) => {
    const q =
      typeof req.query.q === "string"
        ? req.query.q.toLowerCase()
        : typeof req.query.search === "string"
          ? req.query.search.toLowerCase()
          : "";
    const datasetFilter =
      typeof req.query.dataset === "string"
        ? req.query.dataset.toLowerCase()
        : typeof req.query.source === "string"
          ? req.query.source.toLowerCase()
          : "";
    const sentimentFilter =
      typeof req.query.sentiment === "string"
        ? req.query.sentiment.toLowerCase()
        : "";
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1),
      200,
    );
    const offset = Math.max(
      parseInt(String(req.query.offset || "0"), 10) || 0,
      0,
    );

    const records = financialDatasetRaw as unknown as DatasetItem[];
    let filtered = records;
    if (q) {
      filtered = filtered.filter(
        (r) =>
          (r.text?.toLowerCase() || "").includes(q) ||
          (r.sourceName?.toLowerCase() || "").includes(q) ||
          (r.dataset?.toLowerCase() || "").includes(q),
      );
    }
    if (datasetFilter && datasetFilter !== "all") {
      filtered = filtered.filter(
        (r) =>
          (r.dataset?.toLowerCase() || "").includes(datasetFilter) ||
          (r.sourceKind?.toLowerCase() || "").includes(datasetFilter),
      );
    }
    if (sentimentFilter && sentimentFilter !== "all") {
      filtered = filtered.filter(
        (r) => r.sentimentGroundTruth?.toLowerCase() === sentimentFilter,
      );
    }

    const payload: DatasetQueryResponse = {
      total: records.length,
      filteredCount: filtered.length,
      limit,
      offset,
      records: filtered.slice(offset, offset + limit),
    };
    res.json(payload);
  });
  app.get("/api/export", (_req, res) =>
    res
      .attachment(`signaldesk-${service.mode}.json`)
      .json({ exportedAt: new Date().toISOString(), ...service.dashboard() }),
  );
  app.post("/api/analyze", async (req, res) => {
    const doc = documentSchema.parse(req.body),
      signals = await service.analyze(doc);
    res.json({ added: signals.length, signals });
  });
  app.post("/api/replay", async (_req, res) =>
    res.json({ added: (await service.replay()).length }),
  );
  app.post("/api/refresh", async (_req, res) =>
    res.json({
      added: (await service.refresh()).length,
      sources: service.dashboard().sources,
    }),
  );
  app.post("/api/mode", async (req, res) => {
    const { mode } = z
      .object({ mode: z.enum(["demo", "live"]) })
      .parse(req.body);
    await service.setMode(mode);
    res.json({ mode });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Unknown API endpoint" }),
  );
  if (existsSync("dist/index.html")) {
    app.use(express.static("dist"));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(path.resolve("dist/index.html")),
    );
  }
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Invalid input", details: error.flatten() });
        return;
      }
      if (error instanceof ServiceError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({ error: "Malformed JSON" });
        return;
      }
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 413
      ) {
        res.status(413).json({ error: "Request is too large" });
        return;
      }
      console.error(error);
      res.status(500).json({ error: "The update failed. Please try again." });
    },
  );
  return app;
}
