import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("demo API", () => {
  it("lists the four seeded enterprise agents", async () => {
    const response = await createApp().request("/api/agents");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "support-agent" }), expect.objectContaining({ id: "procurement-agent" }),
      expect.objectContaining({ id: "sre-agent" }), expect.objectContaining({ id: "finance-agent" }),
    ]));
  });

  it("runs the safe demo scenario through the gateway", async () => {
    const response = await createApp().request("/api/demo/scenario/safe", { method: "POST" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ decision: { outcome: "ALLOW" } });
  });
});
