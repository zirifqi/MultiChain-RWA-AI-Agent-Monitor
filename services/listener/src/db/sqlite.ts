import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { CanonicalEvent } from "@rwa-monitor/shared-types";

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
    `);
  }

  saveEvent(event: CanonicalEvent): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO canonical_events (
        id, chain, contract_address, tx_hash, block_number, log_index,
        asset_id, event_type, payload_json, severity, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
  }
}
