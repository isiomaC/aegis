import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { investigateRisk } from "./risk-investigator.js";

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: createApp({ assessRisk: investigateRisk }).fetch, port });
console.log(`Aegis Fleet API listening on http://localhost:${port}`);
