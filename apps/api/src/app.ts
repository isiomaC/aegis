import { Hono } from "hono";
import { createHash } from "node:crypto";
import { gatewayActionRequestSchema, type AgentManifest } from "@aegis/contracts";
import { evaluatePolicy } from "@aegis/policy";

const now = "2026-08-31T00:00:00.000Z";
const agents: Record<string, AgentManifest> = {
  "procurement-agent": {
    id: "procurement-agent", name: "Procurement Agent", version: "1.1.0", owner: "Procurement",
    trustTier: "STANDARD", status: "ACTIVE", capabilities: ["create_payment", "cancel_payment", "query_vendor"],
    allowedTools: ["payments"], policyIds: ["procurement-spend-limit"], createdAt: now, updatedAt: now,
  },
  "support-agent": {
    id: "support-agent", name: "Support Agent", version: "1.2.0", owner: "Support",
    trustTier: "STANDARD", status: "ACTIVE", capabilities: ["read_customer_records", "send_customer_response"],
    allowedTools: ["data", "messaging"], policyIds: ["support-data-boundary"], createdAt: now, updatedAt: now,
  },
  "sre-agent": {
    id: "sre-agent", name: "SRE Agent", version: "2.0.0", owner: "Platform Engineering",
    trustTier: "PRIVILEGED", status: "ACTIVE", capabilities: ["restart_service", "scale_service", "inspect_logs"],
    allowedTools: ["infrastructure"], policyIds: ["sre-prod-safety"], createdAt: now, updatedAt: now,
  },
  "finance-agent": {
    id: "finance-agent", name: "Finance Agent", version: "1.0.0", owner: "Finance",
    trustTier: "STANDARD", status: "ACTIVE", capabilities: ["read_invoices", "read_payment_status", "reconcile_payment"],
    allowedTools: ["data"], policyIds: ["finance-data-boundary"], createdAt: now, updatedAt: now,
  },
};

export const createApp = () => {
  const app = new Hono();
  const fleet = structuredClone(agents);
  const completedActions = new Map<string, unknown>();
  const riskScores = new Map<string, number>();
  const auditEvents: Array<{ id: string; agentId: string; actionId: string; action: string; decision: string; previousHash: string | null; eventHash: string }> = [];
  const appendAudit = (agentId: string, actionId: string, action: string, decision: string) => {
    const previousHash = auditEvents.at(-1)?.eventHash ?? null;
    const event = { id: `audit-${auditEvents.length + 1}`, agentId, actionId, action, decision, previousHash };
    const eventHash = createHash("sha256").update(`${previousHash ?? ""}${JSON.stringify(event)}`).digest("hex");
    auditEvents.push({ ...event, eventHash });
  };
  app.get("/health", (context) => context.json({ status: "ok", service: "aegis-fleet" }));
  app.get("/api/agents", (context) => context.json(Object.values(fleet).map((agent) => ({ ...agent, riskScore: riskScores.get(agent.id) ?? 0 }))));
  app.post("/api/gateway/execute", async (context) => {
    const parsed = gatewayActionRequestSchema.safeParse(await context.req.json());
    if (!parsed.success) return context.json({ error: "Invalid action request" }, 400);
    const request = parsed.data;
    const prior = completedActions.get(request.id);
    if (prior) return context.json(prior);

    const agent = fleet[request.agentId];
    if (!agent) {
      const decision = { outcome: "DENY", riskScore: 0, policyIds: [], reasons: ["Unknown agent"] };
      appendAudit(request.agentId, request.id, request.action, decision.outcome);
      return context.json({ decision, execution: null }, 403);
    }
    let decision = evaluatePolicy(agent, request);
    const injectionAttempt = request.context?.externalContent?.toLowerCase().includes("ignore all previous") === true;
    if (injectionAttempt && decision.outcome !== "ALLOW") {
      const riskScore = Math.min(100, (riskScores.get(agent.id) ?? 0) + 50);
      riskScores.set(agent.id, riskScore);
      decision = {
        ...decision,
        riskScore,
        reasons: [...decision.reasons, "Prompt-injection indicator found in external content"],
        outcome: riskScore >= 90 ? "QUARANTINE" : decision.outcome,
      };
      if (decision.outcome === "QUARANTINE") agent.status = "QUARANTINED";
    }
    const response = decision.outcome === "ALLOW"
      ? { decision, execution: { status: "COMPLETED", paymentId: `pay-${request.id}` } }
      : { decision, execution: null };
    appendAudit(request.agentId, request.id, request.action, decision.outcome);
    completedActions.set(request.id, response);
    return context.json(response, decision.outcome === "ALLOW" ? 200 : 403);
  });
  app.get("/api/agents/:id", (context) => {
    const agent = fleet[context.req.param("id")];
    if (!agent) return context.json({ error: "Agent not found" }, 404);
    return context.json({ ...agent, riskScore: riskScores.get(agent.id) ?? 0 });
  });
  app.post("/api/demo/scenario/safe", async (context) => {
    const response = await app.request("/api/gateway/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: `demo-safe-${Date.now()}`, agentId: "procurement-agent", agentVersion: "1.1.0", taskId: "demo-safe",
        tool: "payments", action: "create_payment", resource: "vendor-482",
        arguments: { amount: 180, currency: "USD", approvedVendor: true },
      }),
    });
    return context.json(await response.json(), response.status as 200 | 403);
  });
  app.get("/api/audit/verify", (context) => {
    let previousHash: string | null = null;
    const valid = auditEvents.every((event) => {
      const { eventHash, ...withoutHash } = event;
      const expected = createHash("sha256").update(`${previousHash ?? ""}${JSON.stringify(withoutHash)}`).digest("hex");
      const eventValid = event.previousHash === previousHash && eventHash === expected;
      previousHash = eventHash;
      return eventValid;
    });
    return context.json({ valid, eventsChecked: auditEvents.length, headHash: previousHash });
  });
  return app;
};
