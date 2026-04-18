import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";

export async function registerSignalRoutes(app: FastifyInstance, db: Database.Database): Promise<void> {
  app.get("/signals", async (request) => {
    const query = request.query as {
      limit?: string;
      chain?: string;
      type?: string;
      severity?: string;
      minScore?: string;
      maxScore?: string;
    };

    const limitRaw = Number(query.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const where: string[] = [];
    const values: unknown[] = [];

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

    if (query.minScore !== undefined) {
      const minScore = Number(query.minScore);
      if (Number.isFinite(minScore)) {
        where.push("rs.risk_score >= ?");
        values.push(minScore);
      }
    }

    if (query.maxScore !== undefined) {
      const maxScore = Number(query.maxScore);
      if (Number.isFinite(maxScore)) {
        where.push("rs.risk_score <= ?");
        values.push(maxScore);
      }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const stmt = db.prepare(`
      SELECT
        rs.event_id,
        rs.risk_score,
        rs.confidence,
        rs.recommendation,
        rs.reasoning,
        rs.created_at,
        ce.chain,
        ce.event_type,
        ce.severity,
        ce.asset_id,
        ce.tx_hash,
        ce.observed_at
      FROM risk_signals rs
      JOIN canonical_events ce ON ce.id = rs.event_id
      ${whereSql}
      ORDER BY rs.created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(...values, limit);

    return rows.map((row: any) => ({
      eventId: row.event_id,
      riskScore: Number(row.risk_score),
      confidence: Number(row.confidence),
      recommendation: row.recommendation,
      reasoning: row.reasoning,
      createdAt: row.created_at,
      event: {
        chain: row.chain,
        type: row.event_type,
        severity: row.severity,
        assetId: row.asset_id,
        txHash: row.tx_hash,
        observedAt: row.observed_at
      }
    }));
  });
}
