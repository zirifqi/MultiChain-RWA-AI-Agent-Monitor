import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";

export async function registerEventRoutes(app: FastifyInstance, db: Database.Database): Promise<void> {
  app.get("/events", async (request) => {
    const query = request.query as { limit?: string; chain?: string; type?: string };
    const limit = Math.min(Number(query.limit ?? 50), 200);

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
}
