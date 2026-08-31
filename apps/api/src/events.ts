import { PubSub } from "@google-cloud/pubsub";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

export type SecurityEvent = { type: "gateway.allowed" | "gateway.denied" | "agent.quarantined"; timestamp: string; agentId: string; actionId: string; traceId: string; payload: unknown };
export interface EventPublisher { publish(event: SecurityEvent): Promise<void>; }
export const memoryEventPublisher: EventPublisher = { publish: async () => undefined };

export function createPubSubEventPublisher(): EventPublisher {
  const pubsub = new PubSub({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
  const topic = pubsub.topic(process.env.PUBSUB_TOPIC ?? "aegis-security-events");
  return { publish: async (event) => { await topic.publishMessage({ json: event }); } };
}
