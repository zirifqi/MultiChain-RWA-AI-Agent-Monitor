import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";

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
}
