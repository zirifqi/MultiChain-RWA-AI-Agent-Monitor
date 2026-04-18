import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { CanonicalEvent, RiskSignal } from "@rwa-monitor/shared-types";

export class ListenerStore {
  private db: Database.Database;

  constructor(filePath: string) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(filePath);
    this.bootstrap();
  }

  private bootstrap() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS canonical_events (
        id TEXT PRIMARY KEY,
        chain TEXT NOT NULL,
        contract_address TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        block_number TEXT NOT NULL,
        log_index INTEGER NOT NULL,
        asset_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        severity TEXT NOT NULL,
        observed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_observed_at ON canonical_events(observed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_chain ON canonical_events(chain);
      CREATE INDEX IF NOT EXISTS idx_events_type ON canonical_events(event_type);

      CREATE TABLE IF NOT EXISTS risk_signals (
        event_id TEXT PRIMARY KEY,
        risk_score REAL NOT NULL,
        confidence REAL NOT NULL,
        recommendation TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(event_id) REFERENCES canonical_events(id)
      );

      CREATE INDEX IF NOT EXISTS idx_risk_created_at ON risk_signals(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_risk_score ON risk_signals(risk_score DESC);

      CREATE TABLE IF NOT EXISTS alert_outbox (
        event_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        next_retry_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (event_id, channel),
        FOREIGN KEY(event_id) REFERENCES canonical_events(id)
      );

      CREATE INDEX IF NOT EXISTS idx_alert_outbox_status_retry ON alert_outbox(status, next_retry_at);
    `);
  }

  saveEvent(event: CanonicalEvent): boolean {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO canonical_events (
        id, chain, contract_address, tx_hash, block_number, log_index,
        asset_id, event_type, payload_json, severity, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      event.id,
      event.chain,
      event.contractAddress,
      event.txHash,
      event.blockNumber.toString(),
      event.logIndex,
      event.assetId,
      event.type,
      JSON.stringify(event.payload),
      event.severity,
      event.observedAt
    );

    return result.changes > 0;
  }

  saveRiskSignal(signal: RiskSignal): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO risk_signals (
        event_id, risk_score, confidence, recommendation, reasoning, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      signal.eventId,
      signal.riskScore,
      signal.confidence,
      signal.recommendation,
      signal.reasoning,
      signal.createdAt
    );
  }

  enqueueTelegramAlert(eventId: string): void {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO alert_outbox (
        event_id, channel, status, attempts, last_error, next_retry_at, created_at, updated_at
      ) VALUES (?, 'telegram', 'pending', 0, NULL, ?, ?, ?)
    `);

    stmt.run(eventId, now, now, now);
  }
}
