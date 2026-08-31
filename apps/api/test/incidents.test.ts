import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("incidents", () => {
  it("creates an open incident for a denied overspend", async () => {
    const app = createApp();
    await app.request("/api/demo/scenario/overspend", { method: "POST" });

    const response = await app.request("/api/incidents");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      { agentId: "procurement-agent", severity: "HIGH", status: "OPEN", decision: "DENY" },
    ]);
  });
});
