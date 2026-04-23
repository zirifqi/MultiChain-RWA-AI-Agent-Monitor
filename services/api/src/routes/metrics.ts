import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { z } from "zod";

const querySchema = z.object({
  windowHours: z.coerce.number().int().min(1).max(24 * 30).default(24),
  format: z.enum(["json", "prom"]).default("json")
});

function toPrometheus(metrics: Record<string, number>): string {
  return Object.entries(metrics)
    .map(([key, value]) => `rwa_monitor_${key} ${Number.isFinite(value) ? value : 0}`)
    .join("\n");
}

export async function registerMetricsRoutes(app: FastifyInstance, db: Database.Database): Promise<void> {
  app.get("/metrics", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400);
      return { error: "Invalid query", details: parsed.error.flatten() };
    }

    const { windowHours, format } = parsed.data;
    const nowIso = new Date().toISOString();
    const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    const queueRows = db
      .prepare(
        `
        SELECT status, COUNT(1) AS count
        FROM alert_outbox
        GROUP BY status
      `
      )
      .all() as Array<{ status: string; count: number }>;

    const byStatus: Record<string, number> = {
      pending: 0,
      processing: 0,
      failed: 0,
      sent: 0
    };

    for (const row of queueRows) {
      byStatus[row.status] = Number(row.count);
    }

    const retryDueRow = db
      .prepare(
        `
        SELECT COUNT(1) AS count
        FROM alert_outbox
        WHERE status IN ('pending', 'failed')
          AND next_retry_at <= ?
      `
      )
      .get(nowIso) as { count: number } | undefined;

    const staleRecoveryTotal = db
      .prepare(
        `
        SELECT COUNT(1) AS count
        FROM alert_outbox
        WHERE decision_code = 'requeued_stale_processing'
      `
      )
      .get() as { count: number } | undefined;

    const staleRecoveryWindow = db
      .prepare(
        `
        SELECT COUNT(1) AS count
        FROM alert_outbox
        WHERE decision_code = 'requeued_stale_processing'
          AND updated_at >= ?
      `
      )
      .get(sinceIso) as { count: number } | undefined;

    const successCountRow = db
      .prepare(
        `
        SELECT COUNT(1) AS count
        FROM alert_outbox
        WHERE decision_code IN ('sent_threshold_met', 'sent_escalated_override')
          AND updated_at >= ?
      `
      )
      .get(sinceIso) as { count: number } | undefined;

    const failCountRow = db
      .prepare(
        `
        SELECT COUNT(1) AS count
        FROM alert_outbox
        WHERE decision_code = 'delivery_failed'
          AND updated_at >= ?
      `
      )
      .get(sinceIso) as { count: number } | undefined;

    const successCount = Number(successCountRow?.count ?? 0);
    const failCount = Number(failCountRow?.count ?? 0);
    const totalOutcome = successCount + failCount;

    const metrics = {
      queue_depth_pending: byStatus.pending,
      queue_depth_processing: byStatus.processing,
      queue_depth_failed: byStatus.failed,
      queue_depth_sent: byStatus.sent,
      retry_due: Number(retryDueRow?.count ?? 0),
      stale_recovery_total: Number(staleRecoveryTotal?.count ?? 0),
      stale_recovery_window: Number(staleRecoveryWindow?.count ?? 0),
      send_success_count_window: successCount,
      send_fail_count_window: failCount,
      send_success_rate_window: totalOutcome > 0 ? successCount / totalOutcome : 0,
      send_fail_rate_window: totalOutcome > 0 ? failCount / totalOutcome : 0
    };

    if (format === "prom") {
      reply.header("Content-Type", "text/plain; version=0.0.4");
      return toPrometheus(metrics);
    }

    return {
      windowHours,
      at: nowIso,
      metrics
    };
  });
}
