import type { SupportedChain } from "@rwa-monitor/shared-types";

export interface ChainConfig {
  chain: SupportedChain;
  wsUrl: string;
  rpcUrl: string;
  monitorAddress: `0x${string}`;
}

export interface TelegramAlertConfig {
  enabled: boolean;
  botToken?: string;
  chatId?: string;
  severityThresholds: {
    info: number;
    warning: number;
    critical: number;
  };
}

export interface ListenerConfig {
  sqlitePath: string;
  pollIntervalMs: number;
  chains: ChainConfig[];
  telegramAlerts: TelegramAlertConfig;
}
