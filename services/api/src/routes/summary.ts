import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";

function parseWindowHours(raw: string | undefined): number {
  if (!raw) return 24;

  const trimmed = raw.trim().toLowerCase();
  const matched = trimmed.match(/^(\d+)(h|d)$/);
  if (!matched) return 24;

  const value = Number(matched[1]);
  const unit = matched[2];

  if (!Number.isFinite(value) || value <= 0) return 24;

  const hours = unit === "d" ? value * 24 : value;
  return Math.min(24 * 30, Math.max(1, hours));
}

export async function registerSummaryRoutes(app: FastifyInstance, db: Database.Database): Promise<void> {
  app.get("/summary/severity-counts", async () => {
    const rows = db
      .prepare(
        `
        SELECT severity, COUNT(1) AS count
        FROM canonical_events
        GROUP BY severity
      `
      )
      .all() as Array<{ severity: string; count: number }>;

    const base = {
      info: 0,
      warning: 0,
      critical: 0
    };

    for (const row of rows) {
      if (row.severity in base) {
        (base as Record<string, number>)[row.severity] = Number(row.count);
      }
    }

    return {
      total: base.info + base.warning + base.critical,
      bySeverity: base
    };
  });

  app.get("/summary/alerts-health", async () => {
    const statusRows = db
      .prepare(
        `
        SELECT status, COUNT(1) AS count
        FROM alert_outbox
        GROUP BY status
      `
      )
      .all() as Array<{ status: string; count: number }>;

    const now = new Date().toISOString();
    const backlogRow = db
      .prepare(
        `
        SELECT COUNT(1) AS count
        FROM alert_outbox
        WHERE status IN ('pending', 'failed')
          AND next_retry_at <= ?
      `
      )
      .get(now) as { count: number } | undefined;

    const failedDueRow = db
      .prepare(
        `
        SELECT COUNT(1) AS count
        FROM alert_outbox
        WHERE status = 'failed'
          AND next_retry_at <= ?
      `
      )
      .get(now) as { count: number } | undefined;

    const byStatus: Record<string, number> = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0
    };

    for (const row of statusRows) {
      byStatus[row.status] = Number(row.count);
    }

    return {
      total: byStatus.pending + byStatus.processing + byStatus.sent + byStatus.failed,
      byStatus,
      retryDue: Number(backlogRow?.count ?? 0),
      failedRetryDue: Number(failedDueRow?.count ?? 0)
    };
  });

  app.get("/summary/risk-trend", async (request) => {
    const query = request.query as { window?: string };
    const windowHours = parseWindowHours(query.window);
    const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    const rows = db
      .prepare(
        `
        SELECT
          strftime('%Y-%m-%dT%H:00:00Z', rs.created_at) AS bucket,
          COUNT(1) AS count,
          AVG(rs.risk_score) AS avg_risk_score,
          SUM(CASE WHEN ce.severity = 'info' THEN 1 ELSE 0 END) AS info_count,
          SUM(CASE WHEN ce.severity = 'warning' THEN 1 ELSE 0 END) AS warning_count,
          SUM(CASE WHEN ce.severity = 'critical' THEN 1 ELSE 0 END) AS critical_count
        FROM risk_signals rs
        JOIN canonical_events ce ON ce.id = rs.event_id
        WHERE rs.created_at >= ?
        GROUP BY bucket
        ORDER BY bucket ASC
      `
      )
      .all(sinceIso) as Array<{
      bucket: string;
      count: number;
      avg_risk_score: number;
      info_count: number;
      warning_count: number;
      critical_count: number;
    }>;

    return {
      window: `${windowHours}h`,
      points: rows.map((row) => ({
        bucket: row.bucket,
        count: Number(row.count),
        avgRiskScore: Number(row.avg_risk_score ?? 0),
        bySeverity: {
          info: Number(row.info_count ?? 0),
          warning: Number(row.warning_count ?? 0),
          critical: Number(row.critical_count ?? 0)
        }
      }))
    };
  });

  app.get("/summary/alerts-trend", async (request) => {
    const query = request.query as { window?: string };
    const windowHours = parseWindowHours(query.window);
    const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    const rows = db
      .prepare(
        `
        SELECT
          strftime('%Y-%m-%dT%H:00:00Z', ao.updated_at) AS bucket,
          COUNT(1) AS total,
          SUM(CASE WHEN ao.status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
          SUM(CASE WHEN ao.status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
          SUM(CASE WHEN ao.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
          SUM(CASE WHEN ao.status = 'processing' THEN 1 ELSE 0 END) AS processing_count
        FROM alert_outbox ao
        WHERE ao.updated_at >= ?
        GROUP BY bucket
        ORDER BY bucket ASC
      `
      )
      .all(sinceIso) as Array<{
      bucket: string;
      total: number;
      sent_count: number;
      failed_count: number;
      pending_count: number;
      processing_count: number;
    }>;

    return {
      window: `${windowHours}h`,
      points: rows.map((row) => ({
        bucket: row.bucket,
        total: Number(row.total ?? 0),
        byStatus: {
          sent: Number(row.sent_count ?? 0),
          failed: Number(row.failed_count ?? 0),
          pending: Number(row.pending_count ?? 0),
          processing: Number(row.processing_count ?? 0)
        }
      }))
    };
  });
}
