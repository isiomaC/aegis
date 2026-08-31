import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { investigateRisk } from "./risk-investigator.js";
import { createFirestorePersistence } from "./persistence.js";
import { createPubSubEventPublisher } from "./events.js";

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: createApp({ assessRisk: investigateRisk, persistence: createFirestorePersistence(), eventPublisher: createPubSubEventPublisher() }).fetch, port });
console.log(`Aegis Fleet API listening on http://localhost:${port}`);
