import { describe, expect, it } from "vitest";
import * as contracts from "../src/index.js";

describe("gateway action contracts", () => {
  it("accepts a complete privileged action request", () => {
    const schema = (contracts as Record<string, unknown>).gatewayActionRequestSchema as {
      parse(input: unknown): unknown;
    };

    expect(
      schema.parse({
        id: "act-safe-payment",
        agentId: "procurement-agent",
        agentVersion: "1.1.0",
        taskId: "task-180",
        tool: "payments",
        action: "create_payment",
        resource: "vendor-482",
        arguments: { amount: 180, currency: "USD", approvedVendor: true },
      }),
    ).toMatchObject({ agentId: "procurement-agent", action: "create_payment" });
  });
});
