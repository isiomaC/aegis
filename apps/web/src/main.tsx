import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Agent = { id: string; name: string; owner: string; trustTier: string; status: string; riskScore: number };
type DecisionResponse = { decision: { outcome: string; riskScore: number; reasons: string[] }; execution: { status: string; paymentId?: string } | null };

const labels: Record<string, string> = { "procurement-agent": "Procurement", "support-agent": "Support", "sre-agent": "SRE", "finance-agent": "Finance" };

function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [event, setEvent] = useState("Fleet telemetry idle — ready for a controlled simulation.");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/agents");
    if (response.ok) setAgents(await response.json() as Agent[]);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const runDemo = async (path: string, label: string) => {
    setBusy(true);
    try {
      const response = await fetch(path, { method: "POST" });
      const payload = await response.json() as DecisionResponse;
      setEvent(`${label}: ${payload.decision.outcome} · risk ${payload.decision.riskScore} · ${payload.decision.reasons.join(" · ")}`);
      await refresh();
    } finally { setBusy(false); }
  };

  const reset = async () => { await fetch("/api/demo/reset", { method: "POST" }); setEvent("Demo reset — fleet restored to baseline."); await refresh(); };
  const quarantined = agents.filter((agent) => agent.status === "QUARANTINED").length;

  return <main className="shell">
    <header><div><p className="eyebrow">Aegis Fleet / Security Control Plane</p><h1>Agent actions, under control.</h1></div><button className="ghost" onClick={() => void reset()} disabled={busy}>Reset demo</button></header>
    <section className="metrics"><Metric label="Registered agents" value={agents.length} /><Metric label="Quarantined" value={quarantined} danger={quarantined > 0} /><Metric label="Enforcement" value="Fail closed" /></section>
    <section className="layout">
      <div className="panel fleet"><div className="panelHead"><h2>Fleet posture</h2><span>LIVE</span></div><div className="agents">{agents.map((agent) => <article className="agent" key={agent.id}><div className="avatar">{labels[agent.id]?.slice(0, 1)}</div><div><h3>{agent.name}</h3><p>{agent.owner} · {agent.trustTier}</p></div><div className="risk"><strong>{agent.riskScore}</strong><span className={agent.status === "ACTIVE" ? "active" : "blocked"}>{agent.status}</span></div></article>)}</div></div>
      <div className="panel command"><p className="eyebrow">Guided demo</p><h2>Run the security story</h2><p className="muted">Each scenario uses the same gateway, policy engine, protected action simulator, and audit ledger.</p><div className="actions"><button className="allow" onClick={() => void runDemo("/api/demo/scenario/safe", "Known vendor payment")} disabled={busy}>Run safe payment <small>$180</small></button><button className="deny" onClick={() => void runDemo("/api/demo/scenario/overspend", "Overspend attack")} disabled={busy}>Run overspend <small>$40,000</small></button><button className="deny" onClick={() => void runDemo("/api/demo/scenario/compromised-agent", "Prompt-injection attack")} disabled={busy}>Run prompt injection <small>QUARANTINE</small></button></div></div>
    </section>
    <section className="panel timeline"><div className="panelHead"><h2>Gateway decision</h2><span>TRACE</span></div><p>{event}</p></section>
  </main>;
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) { return <article className={`metric ${danger ? "danger" : ""}`}><p>{label}</p><strong>{value}</strong></article>; }

createRoot(document.getElementById("root")!).render(<App />);
