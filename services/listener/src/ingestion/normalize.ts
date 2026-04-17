import type { CanonicalEvent, CanonicalEventType, Severity, SupportedChain } from "@rwa-monitor/shared-types";

type RawLog = {
  eventName: string;
  args: Record<string, unknown>;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
  address: `0x${string}`;
};

function severityFromType(eventType: CanonicalEventType): Severity {
  switch (eventType) {
    case "ComplianceFlagRaised":
      return "critical";
    case "YieldDropped":
    case "LargeTransferDetected":
      return "warning";
    case "NAVUpdated":
    case "MaturityApproaching":
    default:
      return "info";
  }
}

export function toCanonicalEvent(chain: SupportedChain, raw: RawLog): CanonicalEvent {
  const type = raw.eventName as CanonicalEventType;
  const assetId = String(raw.args.assetId ?? "unknown");
  const id = `${chain}:${raw.transactionHash}:${raw.logIndex}`;

  return {
    id,
    chain,
    contractAddress: raw.address,
    txHash: raw.transactionHash,
    blockNumber: raw.blockNumber,
    logIndex: raw.logIndex,
    assetId,
    type,
    payload: raw.args,
    severity: severityFromType(type),
    observedAt: new Date().toISOString()
  };
}
