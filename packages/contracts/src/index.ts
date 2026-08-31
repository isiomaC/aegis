import { z } from "zod";

export const agentStatusSchema = z.enum(["ACTIVE", "QUARANTINED", "REVOKED"]);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const trustTierSchema = z.enum(["LOW", "STANDARD", "PRIVILEGED"]);
export type TrustTier = z.infer<typeof trustTierSchema>;

export const agentManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  owner: z.string().min(1),
  trustTier: trustTierSchema,
  status: agentStatusSchema,
  capabilities: z.array(z.string().min(1)),
  allowedTools: z.array(z.string().min(1)),
  policyIds: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AgentManifest = z.infer<typeof agentManifestSchema>;

export const gatewayActionRequestSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().min(1),
  agentVersion: z.string().min(1),
  taskId: z.string().min(1),
  tool: z.string().min(1),
  action: z.string().min(1),
  resource: z.string().min(1).optional(),
  arguments: z.record(z.string(), z.unknown()),
  context: z
    .object({
      externalContent: z.string().max(10_000).optional(),
      source: z.string().max(256).optional(),
      correlationId: z.string().max(256).optional(),
    })
    .optional(),
});
export type GatewayActionRequest = z.infer<typeof gatewayActionRequestSchema>;

export const decisionOutcomeSchema = z.enum(["ALLOW", "DENY", "ESCALATE", "QUARANTINE"]);
export type DecisionOutcome = z.infer<typeof decisionOutcomeSchema>;

export const riskAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  reasons: z.array(z.string()),
  indicators: z.array(z.string()),
  recommendedDecision: decisionOutcomeSchema,
  confidence: z.number().min(0).max(1),
});
export type RiskAssessment = z.infer<typeof riskAssessmentSchema>;

export const securityDecisionSchema = z.object({
  outcome: decisionOutcomeSchema,
  riskScore: z.number().min(0).max(100),
  policyIds: z.array(z.string()),
  reasons: z.array(z.string()),
  incidentId: z.string().optional(),
});
export type SecurityDecision = z.infer<typeof securityDecisionSchema>;
