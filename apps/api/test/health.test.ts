import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("reports the Aegis Fleet service as healthy", async () => {
    const response = await createApp().request("/health");
    await expect(response.json()).resolves.toEqual({ status: "ok", service: "aegis-fleet" });
  });
});
