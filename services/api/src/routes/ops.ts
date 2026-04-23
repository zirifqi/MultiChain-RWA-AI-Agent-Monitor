import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { z } from "zod";

const requeueFailedSchema = z.object({
  dryRun: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(5000).default(500)
});

const recoverStaleSchema = z.object({
  dryRun: z.coerce.boolean().default(false),
  processingTimeoutSeconds: z.coerce.number().int().min(30).max(86400).default(120),
  limit: z.coerce.number().int().min(1).max(5000).default(500)
});

export async function registerOpsRoutes(app: FastifyInstance, db: Database.Database): Promise<void> {
  app.post("/ops/alerts/requeue-failed", async (request, reply) => {
    const parsed = requeueFailedSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: "Invalid payload", details: parsed.error.flatten() };
    }

    const { dryRun, limit } = parsed.data;
    const nowIso = new Date().toISOString();

    const countRow = db
      .prepare(
        `
        SELECT COUNT(1) AS count
        FROM (
          SELECT event_id
          FROM alert_outbox
          WHERE channel = 'telegram'
            AND status = 'failed'
            AND next_retry_at > ?
          ORDER BY updated_at ASC
          LIMIT ?
        ) t
      `
      )
      .get(nowIso, limit) as { count: number } | undefined;

    const affected = Number(countRow?.count ?? 0);

    if (dryRun || affected === 0) {
      return {
        action: "requeue-failed",
        dryRun,
        limit,
        affected
      };
    }

    const result = db
      .prepare(
        `
        UPDATE alert_outbox
        SET status = 'failed',
            next_retry_at = ?,
            updated_at = ?,
            decision_code = 'ops_requeued_failed',
            decision_note = 'Manually requeued failed alert for immediate retry'
        WHERE rowid IN (
          SELECT rowid
          FROM alert_outbox
          WHERE channel = 'telegram'
            AND status = 'failed'
            AND next_retry_at > ?
          ORDER BY updated_at ASC
          LIMIT ?
        )
      `
      )
      .run(nowIso, nowIso, nowIso, limit);

    return {
      action: "requeue-failed",
      dryRun,
      limit,
      affected: Number(result.changes ?? 0)
    };
  });

  app.post("/ops/alerts/recover-stale", async (request, reply) => {
    const parsed = recoverStaleSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: "Invalid payload", details: parsed.error.flatten() };
    }

    const { dryRun, processingTimeoutSeconds, limit } = parsed.data;
    const nowIso = new Date().toISOString();
    const staleBefore = new Date(Date.now() - processingTimeoutSeconds * 1000).toISOString();

    const countRow = db
      .prepare(
        `
        SELECT COUNT(1) AS count
        FROM (
          SELECT event_id
          FROM alert_outbox
          WHERE channel = 'telegram'
            AND status = 'processing'
            AND updated_at <= ?
          ORDER BY updated_at ASC
          LIMIT ?
        ) t
      `
      )
      .get(staleBefore, limit) as { count: number } | undefined;

    const affected = Number(countRow?.count ?? 0);

    if (dryRun || affected === 0) {
      return {
        action: "recover-stale",
        dryRun,
        processingTimeoutSeconds,
        limit,
        affected
      };
    }

    const result = db
      .prepare(
        `
        UPDATE alert_outbox
        SET status = 'failed',
            next_retry_at = ?,
            updated_at = ?,
            decision_code = 'ops_recovered_stale',
            decision_note = 'Recovered stale processing alert via ops endpoint'
        WHERE rowid IN (
          SELECT rowid
          FROM alert_outbox
          WHERE channel = 'telegram'
            AND status = 'processing'
            AND updated_at <= ?
          ORDER BY updated_at ASC
          LIMIT ?
        )
      `
      )
      .run(nowIso, nowIso, staleBefore, limit);

    return {
      action: "recover-stale",
      dryRun,
      processingTimeoutSeconds,
      limit,
      affected: Number(result.changes ?? 0)
    };
  });
}
