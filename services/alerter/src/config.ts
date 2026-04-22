import "dotenv/config";
import { z } from "zod";
import type { AlerterConfig } from "./types";

const envSchema = z.object({
  SQLITE_PATH: z.string().default("./data/rwa-monitor.db"),
  ALERTER_POLL_INTERVAL_MS: z.coerce.number().default(5000),

  TELEGRAM_ALERTS_ENABLED: z.coerce.boolean().default(false),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  ALERT_INFO_MIN_SCORE: z.coerce.number().min(0).max(100).default(95),
  ALERT_WARNING_MIN_SCORE: z.coerce.number().min(0).max(100).default(60),
  ALERT_CRITICAL_MIN_SCORE: z.coerce.number().min(0).max(100).default(75),

  ALERT_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(900),
  ALERT_ESCALATION_WINDOW_SECONDS: z.coerce.number().int().min(60).default(1800),
  ALERT_ESCALATION_REPEAT_COUNT: z.coerce.number().int().min(2).default(3),
  ALERT_PROCESSING_TIMEOUT_SECONDS: z.coerce.number().int().min(30).default(120)
});

export function loadConfig(): AlerterConfig {
  const env = envSchema.parse(process.env);

  if (env.TELEGRAM_ALERTS_ENABLED && (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID)) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required when TELEGRAM_ALERTS_ENABLED=true");
  }

  return {
    sqlitePath: env.SQLITE_PATH,
    pollIntervalMs: env.ALERTER_POLL_INTERVAL_MS,
    telegram: {
      enabled: env.TELEGRAM_ALERTS_ENABLED,
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: env.TELEGRAM_CHAT_ID
    },
    severityThresholds: {
      info: env.ALERT_INFO_MIN_SCORE,
      warning: env.ALERT_WARNING_MIN_SCORE,
      critical: env.ALERT_CRITICAL_MIN_SCORE
    },
    policy: {
      cooldownSeconds: env.ALERT_COOLDOWN_SECONDS,
      escalationWindowSeconds: env.ALERT_ESCALATION_WINDOW_SECONDS,
      escalationRepeatCount: env.ALERT_ESCALATION_REPEAT_COUNT,
      processingTimeoutSeconds: env.ALERT_PROCESSING_TIMEOUT_SECONDS
    }
  };
}
