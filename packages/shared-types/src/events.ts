export type SupportedChain =
  | "ethereum"
  | "arbitrum"
  | "base"
  | "optimism"
  | "bsc";

export type Severity = "info" | "warning" | "critical";

export type CanonicalEventType =
  | "NAVUpdated"
  | "YieldDropped"
  | "MaturityApproaching"
  | "LargeTransferDetected"
  | "ComplianceFlagRaised";

export interface CanonicalEvent {
  id: string;
  chain: SupportedChain;
  contractAddress: string;
  txHash: string;
  blockNumber: bigint;
  logIndex: number;
  assetId: string;
  type: CanonicalEventType;
  payload: Record<string, unknown>;
  severity: Severity;
  observedAt: string;
}

export interface RiskSignal {
  eventId: string;
  riskScore: number;
  confidence: number;
  recommendation: string;
  reasoning: string;
  createdAt: string;
}
