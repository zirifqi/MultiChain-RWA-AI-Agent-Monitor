import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";

export async function registerAlertRoutes(app: FastifyInstance, db: Database.Database): Promise<void> {
  app.get("/alerts/outbox", async (request) => {
    const query = request.query as {
      limit?: string;
      status?: string;
      channel?: string;
      chain?: string;
      type?: string;
      severity?: string;
      minAttempts?: string;
      maxAttempts?: string;
    };

    const limitRaw = Number(query.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const where: string[] = [];
    const values: unknown[] = [];

    if (query.status) {
      where.push("ao.status = ?");
      values.push(query.status);
    }

    if (query.channel) {
      where.push("ao.channel = ?");
      values.push(query.channel);
    }

    if (query.chain) {
      where.push("ce.chain = ?");
      values.push(query.chain);
    }

    if (query.type) {
      where.push("ce.event_type = ?");
      values.push(query.type);
    }

    if (query.severity) {
      where.push("ce.severity = ?");
      values.push(query.severity);
    }

    if (query.minAttempts !== undefined) {
      const minAttempts = Number(query.minAttempts);
      if (Number.isFinite(minAttempts)) {
        where.push("ao.attempts >= ?");
        values.push(Math.max(0, Math.floor(minAttempts)));
      }
    }

    if (query.maxAttempts !== undefined) {
      const maxAttempts = Number(query.maxAttempts);
      if (Number.isFinite(maxAttempts)) {
        where.push("ao.attempts <= ?");
        values.push(Math.max(0, Math.floor(maxAttempts)));
      }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const stmt = db.prepare(`
      SELECT
        ao.event_id,
        ao.channel,
        ao.status,
        ao.attempts,
        ao.last_error,
        ao.next_retry_at,
        ao.created_at,
        ao.updated_at,
        ce.chain,
        ce.asset_id,
        ce.event_type,
        ce.severity,
        ce.tx_hash,
        ce.observed_at,
        rs.risk_score,
        rs.confidence,
        rs.recommendation,
        rs.reasoning,
        rs.created_at AS signal_created_at
      FROM alert_outbox ao
      LEFT JOIN canonical_events ce ON ce.id = ao.event_id
      LEFT JOIN risk_signals rs ON rs.event_id = ao.event_id
      ${whereSql}
      ORDER BY ao.updated_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(...values, limit);

    return rows.map((row: any) => ({
      eventId: row.event_id,
      channel: row.channel,
      status: row.status,
      attempts: Number(row.attempts),
      lastError: row.last_error,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      event: row.chain
        ? {
            chain: row.chain,
            assetId: row.asset_id,
            type: row.event_type,
            severity: row.severity,
            txHash: row.tx_hash,
            observedAt: row.observed_at
          }
        : null,
      signal:
        row.risk_score === null
          ? null
          : {
              riskScore: Number(row.risk_score),
              confidence: Number(row.confidence),
              recommendation: row.recommendation,
              reasoning: row.reasoning,
              createdAt: row.signal_created_at
            }
    }));
  });

  app.get("/alerts/outbox/:eventId", async (request, reply) => {
    const params = request.params as { eventId: string };

    const row = db
      .prepare(
        `
        SELECT
          ao.event_id,
          ao.channel,
          ao.status,
          ao.attempts,
          ao.last_error,
          ao.next_retry_at,
          ao.created_at,
          ao.updated_at,
          ce.id,
          ce.chain,
          ce.contract_address,
          ce.tx_hash,
          ce.block_number,
          ce.log_index,
          ce.asset_id,
          ce.event_type,
          ce.payload_json,
          ce.severity,
          ce.observed_at,
          rs.risk_score,
          rs.confidence,
          rs.recommendation,
          rs.reasoning,
          rs.created_at AS signal_created_at
        FROM alert_outbox ao
        LEFT JOIN canonical_events ce ON ce.id = ao.event_id
        LEFT JOIN risk_signals rs ON rs.event_id = ao.event_id
        WHERE ao.event_id = ?
          AND ao.channel = 'telegram'
        LIMIT 1
      `
      )
      .get(params.eventId) as any;

    if (!row) {
      reply.code(404);
      return { error: "Alert outbox entry not found", eventId: params.eventId };
    }

    return {
      eventId: row.event_id,
      channel: row.channel,
      status: row.status,
      attempts: Number(row.attempts),
      lastError: row.last_error,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      event: row.id
        ? {
            id: row.id,
            chain: row.chain,
            contractAddress: row.contract_address,
            txHash: row.tx_hash,
            blockNumber: row.block_number,
            logIndex: row.log_index,
            assetId: row.asset_id,
            type: row.event_type,
            payload: JSON.parse(row.payload_json),
            severity: row.severity,
            observedAt: row.observed_at
          }
        : null,
      signal:
        row.risk_score === null
          ? null
          : {
              eventId: row.event_id,
              riskScore: Number(row.risk_score),
              confidence: Number(row.confidence),
              recommendation: row.recommendation,
              reasoning: row.reasoning,
              createdAt: row.signal_created_at
            }
    };
  });
}
