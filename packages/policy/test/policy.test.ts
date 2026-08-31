import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../src/index.js";

const procurementAgent = {
  id: "procurement-agent",
  name: "Procurement Agent",
  version: "1.1.0",
  owner: "Procurement",
  trustTier: "STANDARD" as const,
  status: "ACTIVE" as const,
  capabilities: ["create_payment", "cancel_payment", "query_vendor"],
  allowedTools: ["payments"],
  policyIds: ["procurement-spend-limit"],
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

describe("evaluatePolicy", () => {
  it("allows an approved vendor payment within the autonomous limit", () => {
    expect(
      evaluatePolicy(procurementAgent, {
        id: "act-safe-payment",
        agentId: "procurement-agent",
        agentVersion: "1.1.0",
        taskId: "task-180",
        tool: "payments",
        action: "create_payment",
        resource: "vendor-482",
        arguments: { amount: 180, currency: "USD", approvedVendor: true },
      }),
    ).toMatchObject({ outcome: "ALLOW", policyIds: ["procurement-spend-limit"] });
  });

  it("escalates a procurement payment above the autonomous limit", () => {
    expect(
      evaluatePolicy(procurementAgent, {
        id: "act-escalated-payment", agentId: "procurement-agent", agentVersion: "1.1.0", taskId: "task-600",
        tool: "payments", action: "create_payment", resource: "vendor-482",
        arguments: { amount: 600, currency: "USD", approvedVendor: true },
      }),
    ).toMatchObject({ outcome: "ESCALATE" });
  });

  it("denies a procurement payment above the hard limit", () => {
    expect(
      evaluatePolicy(procurementAgent, {
        id: "act-overspend", agentId: "procurement-agent", agentVersion: "1.1.0", taskId: "task-40000",
        tool: "payments", action: "create_payment", resource: "new-vendor",
        arguments: { amount: 40_000, currency: "USD", approvedVendor: false },
      }),
    ).toMatchObject({ outcome: "DENY" });
  });

  it("denies actions for a quarantined agent", () => {
    expect(
      evaluatePolicy({ ...procurementAgent, status: "QUARANTINED" }, {
        id: "act-quarantined", agentId: "procurement-agent", agentVersion: "1.1.0", taskId: "task-blocked",
        tool: "payments", action: "create_payment", arguments: { amount: 180, currency: "USD", approvedVendor: true },
      }),
    ).toMatchObject({ outcome: "DENY" });
  });
});
