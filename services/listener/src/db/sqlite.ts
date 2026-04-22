import type Database from "better-sqlite3";
import type { CanonicalEvent, RiskSignal } from "@rwa-monitor/shared-types";
import { openSqlite } from "../../../../infra/sqlite/open";

export class ListenerStore {
  private db: Database.Database;

  constructor(filePath: string) {
    this.db = openSqlite(filePath);
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
        event_id, channel, status, attempts, last_error, next_retry_at, created_at, updated_at, decision_code, decision_note
      ) VALUES (?, 'telegram', 'pending', 0, NULL, ?, ?, ?, 'queued_for_delivery', 'Event queued by listener')
    `);

    stmt.run(eventId, now, now, now);
  }
}
