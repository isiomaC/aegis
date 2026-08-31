import type { AgentManifest, GatewayActionRequest, SecurityDecision } from "@aegis/contracts";

const deny = (reason: string, policyIds: string[]): SecurityDecision => ({
  outcome: "DENY",
  riskScore: 0,
  policyIds,
  reasons: [reason],
});

const amountFrom = (request: GatewayActionRequest): number | undefined => {
  const amount = request.arguments.amount;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : undefined;
};

export function evaluatePolicy(
  agent: AgentManifest,
  request: GatewayActionRequest,
): SecurityDecision {
  if (agent.status !== "ACTIVE") {
    return deny(`Agent is ${agent.status.toLowerCase()}`, agent.policyIds);
  }

  if (!agent.allowedTools.includes(request.tool)) {
    return deny(`Tool '${request.tool}' is not allowed for this agent`, agent.policyIds);
  }

  if (!agent.capabilities.includes(request.action)) {
    return deny(`Action '${request.action}' is not a declared capability`, agent.policyIds);
  }

  if (agent.id === "procurement-agent" && request.action === "create_payment") {
    const amount = amountFrom(request);
    const approvedVendor = request.arguments.approvedVendor === true;
    const currency = request.arguments.currency;
    const isSupportedCurrency = currency === "USD" || currency === "EUR";

    if (amount === undefined || !isSupportedCurrency) {
      return deny("Payment requires a valid USD or EUR amount", ["procurement-spend-limit"]);
    }
    if (amount > 5_000) {
      return deny("Amount exceeds the hard autonomous spending limit", ["procurement-spend-limit"]);
    }
    if (amount > 500 || !approvedVendor) {
      return {
        outcome: "ESCALATE",
        riskScore: 0,
        policyIds: ["procurement-spend-limit"],
        reasons: [amount > 500 ? "Amount requires human approval" : "Recipient requires human approval"],
      };
    }
  }

  return {
    outcome: "ALLOW",
    riskScore: 0,
    policyIds: agent.policyIds,
    reasons: ["Action is within the agent's declared policy"],
  };
}
