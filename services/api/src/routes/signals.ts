import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { signalsQuerySchema } from "./validation";

export async function registerSignalRoutes(app: FastifyInstance, db: Database.Database): Promise<void> {
  app.get("/signals", async (request, reply) => {
    const parsed = signalsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400);
      return { error: "Invalid query", details: parsed.error.flatten() };
    }

    const query = parsed.data;

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
      where.push("rs.risk_score >= ?");
      values.push(query.minScore);
    }

    if (query.maxScore !== undefined) {
      where.push("rs.risk_score <= ?");
      values.push(query.maxScore);
    }

    if (query.cursor) {
      where.push("rs.created_at < ?");
      values.push(query.cursor);
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

    const rows = stmt.all(...values, query.limit) as any[];

    const items = rows.map((row) => ({
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

    return {
      items,
      pageInfo: {
        limit: query.limit,
        nextCursor: items.length > 0 ? items[items.length - 1].createdAt : null
      }
    };
  });
}
