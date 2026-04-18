import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";

export async function registerEventRoutes(app: FastifyInstance, db: Database.Database): Promise<void> {
  app.get("/events", async (request) => {
    const query = request.query as { limit?: string; chain?: string; type?: string };
    const limitRaw = Number(query.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const where: string[] = [];
    const values: unknown[] = [];

    if (query.chain) {
      where.push("chain = ?");
      values.push(query.chain);
    }

    if (query.type) {
      where.push("event_type = ?");
      values.push(query.type);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const stmt = db.prepare(`
      SELECT id, chain, contract_address, tx_hash, block_number, log_index, asset_id, event_type, payload_json, severity, observed_at
      FROM canonical_events
      ${whereSql}
      ORDER BY observed_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(...values, limit);

    return rows.map((row: any) => ({
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
    }));
  });

  app.get("/events/:id", async (request, reply) => {
    const params = request.params as { id: string };

    const stmt = db.prepare(`
      SELECT
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
        rs.created_at
      FROM canonical_events ce
      LEFT JOIN risk_signals rs ON rs.event_id = ce.id
      WHERE ce.id = ?
      LIMIT 1
    `);

    const row = stmt.get(params.id) as any;

    if (!row) {
      reply.code(404);
      return { error: "Event not found", id: params.id };
    }

    return {
      event: {
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
      },
      signal:
        row.risk_score === null
          ? null
          : {
              eventId: row.id,
              riskScore: Number(row.risk_score),
              confidence: Number(row.confidence),
              recommendation: row.recommendation,
              reasoning: row.reasoning,
              createdAt: row.created_at
            }
    };
  });
}
