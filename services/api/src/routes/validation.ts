import { z } from "zod";

export const chainSchema = z.enum(["ethereum", "arbitrum", "base", "optimism", "bsc"]);
export const eventTypeSchema = z.enum([
  "NAVUpdated",
  "YieldDropped",
  "MaturityApproaching",
  "LargeTransferDetected",
  "ComplianceFlagRaised"
]);
export const severitySchema = z.enum(["info", "warning", "critical"]);

export const cursorSchema = z.string().datetime().optional();

export const basePaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: cursorSchema
});

export const eventsQuerySchema = basePaginationSchema.extend({
  chain: chainSchema.optional(),
  type: eventTypeSchema.optional()
});

export const signalsQuerySchema = basePaginationSchema.extend({
  chain: chainSchema.optional(),
  type: eventTypeSchema.optional(),
  severity: severitySchema.optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional()
}).superRefine((val, ctx) => {
  if (val.minScore !== undefined && val.maxScore !== undefined && val.minScore > val.maxScore) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "minScore must be <= maxScore",
      path: ["minScore"]
    });
  }
});

export const alertStatusSchema = z.enum(["pending", "processing", "sent", "failed"]);
export const alertChannelSchema = z.enum(["telegram"]);

export const alertsQuerySchema = basePaginationSchema.extend({
  status: alertStatusSchema.optional(),
  channel: alertChannelSchema.optional(),
  chain: chainSchema.optional(),
  type: eventTypeSchema.optional(),
  severity: severitySchema.optional(),
  minAttempts: z.coerce.number().int().min(0).optional(),
  maxAttempts: z.coerce.number().int().min(0).optional(),
  decisionCode: z.string().min(1).max(120).optional()
}).superRefine((val, ctx) => {
  if (val.minAttempts !== undefined && val.maxAttempts !== undefined && val.minAttempts > val.maxAttempts) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "minAttempts must be <= maxAttempts",
      path: ["minAttempts"]
    });
  }
});

export const eventParamsSchema = z.object({
  id: z.string().min(1)
});

export const alertParamsSchema = z.object({
  eventId: z.string().min(1)
});
