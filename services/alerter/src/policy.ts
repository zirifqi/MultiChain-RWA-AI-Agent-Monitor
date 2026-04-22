import type { Severity } from "@rwa-monitor/shared-types";

export function meetsSeverityThreshold(
  severity: Severity,
  riskScore: number,
  thresholds: Record<Severity, number>
): boolean {
  return riskScore >= thresholds[severity];
}
