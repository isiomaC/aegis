import { Firestore } from "@google-cloud/firestore";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import type { AgentManifest, GatewayActionRequest, SecurityDecision } from "@aegis/contracts";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

export type PersistedIncident = { id: string; agentId: string; severity: string; status: string; decision: string; summary: string; createdAt: string };
export type PersistedAuditEvent = { id: string; agentId: string; actionId: string; action: string; decision: string; previousHash: string | null; eventHash: string };

export interface Persistence {
  record(input: { agent: AgentManifest; request: GatewayActionRequest; decision: SecurityDecision; riskScore: number; incident?: PersistedIncident; auditEvent: PersistedAuditEvent }): Promise<void>;
}

export const memoryPersistence: Persistence = { record: async () => undefined };

export function createFirestorePersistence(): Persistence {
  const firestore = new Firestore({ projectId: process.env.GOOGLE_CLOUD_PROJECT, databaseId: process.env.FIRESTORE_DATABASE_ID });
  return {
    async record({ agent, request, decision, riskScore, incident, auditEvent }) {
      const batch = firestore.batch();
      batch.set(firestore.collection("agents").doc(agent.id), { ...agent, riskScore, updatedAt: new Date().toISOString() }, { merge: true });
      batch.set(firestore.collection("actions").doc(request.id), { ...request, decision, createdAt: new Date().toISOString() });
      batch.set(firestore.collection("auditEvents").doc(auditEvent.id), auditEvent);
      if (incident) batch.set(firestore.collection("incidents").doc(incident.id), incident);
      await batch.commit();
    },
  };
}
