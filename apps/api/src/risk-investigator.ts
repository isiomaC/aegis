import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { Gemini, InMemoryRunner, LlmAgent } from "@google/adk";
import { riskAssessmentSchema, type GatewayActionRequest, type RiskAssessment } from "@aegis/contracts";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

export type RiskInvestigationInput = {
  request: GatewayActionRequest;
  recentDenies: number;
};

const model = new Gemini({
  model: process.env.AEGIS_GEMINI_MODEL ?? "gemini-2.5-flash",
  vertexai: process.env.GOOGLE_GENAI_USE_VERTEXAI === "true",
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION,
});

const agent = new LlmAgent({
  name: "risk_investigator",
  model,
  instruction: "You are a security risk investigator. Analyze the supplied agent action. You never authorize actions; recommend a decision only. Return ONLY this JSON object: {\"score\": number from 0 to 100, \"severity\": \"LOW\"|\"MEDIUM\"|\"HIGH\"|\"CRITICAL\", \"reasons\": string[], \"indicators\": string[], \"recommendedDecision\": \"ALLOW\"|\"DENY\"|\"ESCALATE\"|\"QUARANTINE\", \"confidence\": number from 0 to 1}. Do not use any other field names and do not wrap JSON in prose.",
});

const runner = new InMemoryRunner({ agent, appName: "aegis-fleet" });

const parseAssessment = (text: string): RiskAssessment => {
  const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return riskAssessmentSchema.parse(JSON.parse(json));
  } catch {
    throw new Error(`Risk assessment did not match the required schema: ${json}`);
  }
};

export async function investigateRisk(input: RiskInvestigationInput): Promise<RiskAssessment> {
  let text = "";
  for await (const event of runner.runEphemeral({
    userId: "aegis-gateway",
    newMessage: { role: "user", parts: [{ text: JSON.stringify(input) }] },
  })) {
    const candidate = event.output === undefined
      ? event.content?.parts?.map((part) => part.text ?? "").join("") ?? ""
      : JSON.stringify(event.output);
    if (candidate) text = candidate;
  }
  return parseAssessment(text);
}
