import type { Severity } from "@rwa-monitor/shared-types";

export interface AlerterConfig {
  sqlitePath: string;
  pollIntervalMs: number;
  telegram: {
    enabled: boolean;
    botToken?: string;
    chatId?: string;
  };
  severityThresholds: Record<Severity, number>;
}

export interface AlertCandidate {
  eventId: string;
  channel: "telegram";
  attempts: number;
  chain: string;
  assetId: string;
  type: string;
  severity: Severity;
  txHash: string;
  riskScore: number;
  confidence: number;
  recommendation: string;
  reasoning: string;
  observedAt: string;
}
