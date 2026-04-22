import type Database from "better-sqlite3";
import type { AlertCandidate, AlerterConfig } from "./types";
import { meetsSeverityThreshold } from "./policy";
import { openSqlite } from "../../../infra/sqlite/open";

export class AlerterStore {
  private db: Database.Database;

  constructor(filePath: string) {
    this.db = openSqlite(filePath);
  }

  requeueStuckProcessing(processingTimeoutSeconds: number): number {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - processingTimeoutSeconds * 1000).toISOString();
    const nowIso = now.toISOString();

    const result = this.db
      .prepare(
        `
        UPDATE alert_outbox
        SET status = 'failed',
            next_retry_at = ?,
            updated_at = ?,
            decision_code = 'requeued_stale_processing',
            decision_note = 'Stale processing lock recovered for retry'
        WHERE channel = 'telegram'
          AND status = 'processing'
          AND updated_at <= ?
      `
      )
      .run(nowIso, nowIso, staleBefore);

    return Number(result.changes ?? 0);
  }

  fetchDueTelegramCandidates(limit: number): AlertCandidate[] {
    const now = new Date().toISOString();

    const rows = this.db
      .prepare(
        `
        SELECT
          ao.event_id,
          ao.channel,
          ao.attempts,
          ce.chain,
          ce.asset_id,
          ce.event_type,
          ce.severity,
          ce.tx_hash,
          ce.observed_at,
          rs.risk_score,
          rs.confidence,
          rs.recommendation,
          rs.reasoning
        FROM alert_outbox ao
        JOIN canonical_events ce ON ce.id = ao.event_id
        JOIN risk_signals rs ON rs.event_id = ao.event_id
        WHERE ao.channel = 'telegram'
          AND ao.status IN ('pending', 'failed')
          AND ao.next_retry_at <= ?
        ORDER BY ao.created_at ASC
        LIMIT ?
      `
      )
      .all(now, limit) as any[];

    return rows.map((row) => ({
      eventId: row.event_id,
      channel: row.channel,
      attempts: Number(row.attempts),
      chain: row.chain,
      assetId: row.asset_id,
      type: row.event_type,
      severity: row.severity,
      txHash: row.tx_hash,
      riskScore: Number(row.risk_score),
      confidence: Number(row.confidence),
      recommendation: row.recommendation,
      reasoning: row.reasoning,
      observedAt: row.observed_at
    }));
  }

  claimForProcessing(eventId: string): boolean {
    const now = new Date().toISOString();

    const result = this.db
      .prepare(
        `
        UPDATE alert_outbox
        SET status = 'processing',
            updated_at = ?,
            decision_code = 'dispatching',
            decision_note = 'Alerter claimed message for delivery attempt'
        WHERE event_id = ?
          AND channel = 'telegram'
          AND status IN ('pending', 'failed')
          AND next_retry_at <= ?
      `
      )
      .run(now, eventId, now);

    return Number(result.changes ?? 0) > 0;
  }

  markSent(eventId: string, decisionCode = "sent", decisionNote = "Delivered successfully"): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE alert_outbox
        SET status = 'sent',
            updated_at = ?,
            last_error = NULL,
            decision_code = ?,
            decision_note = ?
        WHERE event_id = ? AND channel = 'telegram'
      `
      )
      .run(now, decisionCode, decisionNote, eventId);
  }

  markFailed(eventId: string, errorMessage: string, attempts: number): void {
    const now = new Date().toISOString();
    const backoffSeconds = Math.min(300, Math.max(10, attempts * 10));
    const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

    this.db
      .prepare(
        `
        UPDATE alert_outbox
        SET status = 'failed',
            attempts = attempts + 1,
            last_error = ?,
            next_retry_at = ?,
            updated_at = ?,
            decision_code = 'delivery_failed',
            decision_note = ?
        WHERE event_id = ? AND channel = 'telegram'
      `
      )
      .run(
        errorMessage.slice(0, 1000),
        nextRetryAt,
        now,
        `Delivery failed; retry scheduled in ~${backoffSeconds}s`,
        eventId
      );
  }

  meetsThreshold(candidate: AlertCandidate, thresholds: AlerterConfig["severityThresholds"]): boolean {
    return meetsSeverityThreshold(candidate.severity, candidate.riskScore, thresholds);
  }

  hasRecentSentDuplicate(candidate: AlertCandidate, cooldownSeconds: number): boolean {
    if (cooldownSeconds <= 0) return false;

    const sinceIso = new Date(Date.now() - cooldownSeconds * 1000).toISOString();

    const row = this.db
      .prepare(
        `
        SELECT 1
        FROM alert_outbox ao
        JOIN canonical_events ce ON ce.id = ao.event_id
        WHERE ao.channel = 'telegram'
          AND ao.status = 'sent'
          AND ao.event_id != ?
          AND ce.asset_id = ?
          AND ce.event_type = ?
          AND ce.severity = ?
          AND ao.updated_at >= ?
        LIMIT 1
      `
      )
      .get(candidate.eventId, candidate.assetId, candidate.type, candidate.severity, sinceIso);

    return Boolean(row);
  }

  countRecentSentByAssetType(candidate: AlertCandidate, windowSeconds: number): number {
    const sinceIso = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const row = this.db
      .prepare(
        `
        SELECT COUNT(1) AS cnt
        FROM alert_outbox ao
        JOIN canonical_events ce ON ce.id = ao.event_id
        WHERE ao.channel = 'telegram'
          AND ao.status = 'sent'
          AND ce.asset_id = ?
          AND ce.event_type = ?
          AND ao.updated_at >= ?
      `
      )
      .get(candidate.assetId, candidate.type, sinceIso) as any;

    return Number(row?.cnt ?? 0);
  }
}
