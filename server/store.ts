import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Mode, Signal, Snapshot } from "../shared/types";

export class Store {
  private db: DatabaseSync;
  constructor(
    filename = process.env.DATABASE_PATH ?? "data/signaldesk.sqlite",
  ) {
    if (filename !== ":memory:")
      mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS signals (id TEXT PRIMARY KEY, mode TEXT NOT NULL, published_at TEXT NOT NULL, body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS signals_mode_date ON signals(mode, published_at);
      CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, mode TEXT NOT NULL, timestamp TEXT NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  }
  signals(mode: Mode): Signal[] {
    return this.db
      .prepare(
        "SELECT body FROM signals WHERE mode = ? ORDER BY published_at DESC",
      )
      .all(mode)
      .map((row) => JSON.parse(row.body as string));
  }
  history(mode: Mode): Snapshot[] {
    return this.db
      .prepare(
        "SELECT body FROM snapshots WHERE mode = ? ORDER BY timestamp, rowid",
      )
      .all(mode)
      .map((row) => JSON.parse(row.body as string));
  }
  has(id: string) {
    return !!this.db.prepare("SELECT id FROM signals WHERE id = ?").get(id);
  }
  save(
    signals: Signal[],
    snapshot?: Snapshot,
    metadata: Record<string, string> = {},
  ) {
    this.db.exec("BEGIN");
    try {
      const statement = this.db.prepare(
        "INSERT OR IGNORE INTO signals VALUES (?, ?, ?, ?)",
      );
      for (const s of signals)
        statement.run(s.id, s.mode, s.publishedAt, JSON.stringify(s));
      if (snapshot)
        this.db
          .prepare("INSERT INTO snapshots VALUES (?, ?, ?, ?)")
          .run(
            snapshot.id,
            snapshot.mode,
            snapshot.timestamp,
            JSON.stringify(snapshot),
          );
      for (const [key, value] of Object.entries(metadata))
        this.db
          .prepare("INSERT OR REPLACE INTO metadata VALUES (?, ?)")
          .run(key, value);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  get(key: string) {
    return this.db.prepare("SELECT value FROM metadata WHERE key = ?").get(key)
      ?.value as string | undefined;
  }
  close() {
    this.db.close();
  }
}
