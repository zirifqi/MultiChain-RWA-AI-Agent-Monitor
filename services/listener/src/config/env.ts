import "dotenv/config";
import { z } from "zod";
import type { ListenerConfig } from "../types/config";

const envSchema = z.object({
  SQLITE_PATH: z.string().default("./data/rwa-monitor.db"),
  POLL_INTERVAL_MS: z.coerce.number().default(5000),

  TELEGRAM_ALERTS_ENABLED: z.coerce.boolean().default(false),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  ALERT_INFO_MIN_SCORE: z.coerce.number().min(0).max(100).default(95),
  ALERT_WARNING_MIN_SCORE: z.coerce.number().min(0).max(100).default(60),
  ALERT_CRITICAL_MIN_SCORE: z.coerce.number().min(0).max(100).default(75),

  ETHEREUM_WS_URL: z.string().min(1),
  ETHEREUM_RPC_URL: z.string().min(1),
  ETHEREUM_MONITOR_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

  ARBITRUM_WS_URL: z.string().min(1),
  ARBITRUM_RPC_URL: z.string().min(1),
  ARBITRUM_MONITOR_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

  BASE_WS_URL: z.string().min(1),
  BASE_RPC_URL: z.string().min(1),
  BASE_MONITOR_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

  OPTIMISM_WS_URL: z.string().min(1),
  OPTIMISM_RPC_URL: z.string().min(1),
  OPTIMISM_MONITOR_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

  BSC_WS_URL: z.string().min(1),
  BSC_RPC_URL: z.string().min(1),
  BSC_MONITOR_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export function loadConfig(): ListenerConfig {
  const env = envSchema.parse(process.env);

  if (env.TELEGRAM_ALERTS_ENABLED && (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID)) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required when TELEGRAM_ALERTS_ENABLED=true");
  }

  return {
    sqlitePath: env.SQLITE_PATH,
    pollIntervalMs: env.POLL_INTERVAL_MS,
    telegramAlerts: {
      enabled: env.TELEGRAM_ALERTS_ENABLED,
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: env.TELEGRAM_CHAT_ID,
      severityThresholds: {
        info: env.ALERT_INFO_MIN_SCORE,
        warning: env.ALERT_WARNING_MIN_SCORE,
        critical: env.ALERT_CRITICAL_MIN_SCORE
      }
    },
    chains: [
      {
        chain: "ethereum",
        wsUrl: env.ETHEREUM_WS_URL,
        rpcUrl: env.ETHEREUM_RPC_URL,
        monitorAddress: env.ETHEREUM_MONITOR_ADDRESS as `0x${string}`
      },
      {
        chain: "arbitrum",
        wsUrl: env.ARBITRUM_WS_URL,
        rpcUrl: env.ARBITRUM_RPC_URL,
        monitorAddress: env.ARBITRUM_MONITOR_ADDRESS as `0x${string}`
      },
      {
        chain: "base",
        wsUrl: env.BASE_WS_URL,
        rpcUrl: env.BASE_RPC_URL,
        monitorAddress: env.BASE_MONITOR_ADDRESS as `0x${string}`
      },
      {
        chain: "optimism",
        wsUrl: env.OPTIMISM_WS_URL,
        rpcUrl: env.OPTIMISM_RPC_URL,
        monitorAddress: env.OPTIMISM_MONITOR_ADDRESS as `0x${string}`
      },
      {
        chain: "bsc",
        wsUrl: env.BSC_WS_URL,
        rpcUrl: env.BSC_RPC_URL,
        monitorAddress: env.BSC_MONITOR_ADDRESS as `0x${string}`
      }
    ]
  };
}
