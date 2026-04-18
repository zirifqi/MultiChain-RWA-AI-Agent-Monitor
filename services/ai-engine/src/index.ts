import type { CanonicalEvent, RiskSignal } from "@rwa-monitor/shared-types";
import { z } from "zod";

const canonicalEventSchema = z.object({
  id: z.string().min(1),
  chain: z.enum(["ethereum", "arbitrum", "base", "optimism", "bsc"]),
  contractAddress: z.string().regex(/^0x[0-9a-fA-F]+$/),
  txHash: z.string().regex(/^0x[0-9a-fA-F]+$/),
  blockNumber: z.bigint().nonnegative(),
  logIndex: z.number().int().nonnegative(),
  assetId: z.string().min(1),
  type: z.enum([
    "NAVUpdated",
    "YieldDropped",
    "MaturityApproaching",
    "LargeTransferDetected",
    "ComplianceFlagRaised"
  ]),
  payload: z.record(z.unknown()),
  severity: z.enum(["info", "warning", "critical"]),
  observedAt: z.string().datetime()
});

const riskSignalSchema = z.object({
  eventId: z.string().min(1),
  riskScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  recommendation: z.string().min(1),
  reasoning: z.string().min(1),
  createdAt: z.string().datetime()
});

function scoreByType(event: CanonicalEvent): Pick<RiskSignal, "riskScore" | "confidence" | "recommendation" | "reasoning"> {
  switch (event.type) {
    case "ComplianceFlagRaised": {
      const flagged = Boolean(event.payload.flagged ?? true);
      return {
        riskScore: flagged ? 92 : 35,
        confidence: 0.9,
        recommendation: flagged ? "Escalate to compliance team immediately." : "Monitor for recurring compliance updates.",
        reasoning: flagged
          ? "Compliance flag raised on-chain, indicating potentially material compliance risk."
          : "Compliance status changed but currently not flagged."
      };
    }
    case "LargeTransferDetected":
      return {
        riskScore: 78,
        confidence: 0.82,
        recommendation: "Review transfer source/destination and liquidity impact.",
        reasoning: "Large transfer event exceeded configured threshold."
      };
    case "YieldDropped": {
      const drop = Number(event.payload.dropBps ?? 0);
      const normalized = Math.min(100, Math.max(0, Math.round(drop / 5)));
      return {
        riskScore: Math.max(55, normalized),
        confidence: 0.8,
        recommendation: "Check asset cashflow and issuer guidance for yield pressure.",
        reasoning: `Yield drop detected (${drop} bps).`
      };
    }
    case "MaturityApproaching":
      return {
        riskScore: 42,
        confidence: 0.72,
        recommendation: "Prepare rollover/refinancing decision before maturity window closes.",
        reasoning: "Asset maturity is approaching based on configured alert window."
      };
    case "NAVUpdated":
    default:
      return {
        riskScore: 20,
        confidence: 0.65,
        recommendation: "Track NAV trend for anomaly detection.",
        reasoning: "Routine NAV update with no direct risk escalation signal."
      };
  }
}

export function scoreCanonicalEvent(input: unknown): RiskSignal {
  const event = canonicalEventSchema.parse(input);

  const scored = scoreByType(event);

  const signal = riskSignalSchema.parse({
    eventId: event.id,
    riskScore: scored.riskScore,
    confidence: scored.confidence,
    recommendation: scored.recommendation,
    reasoning: scored.reasoning,
    createdAt: new Date().toISOString()
  });

  return signal;
}
