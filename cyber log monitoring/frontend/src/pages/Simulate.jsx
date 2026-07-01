import { useState } from "react";
import { api } from "../api/client";

const SCENARIOS = [
  {
    key: "brute-force",
    title: "Brute Force Attack",
    desc: "8 failed logins against a target username from one attacker IP within seconds.",
    fields: [{ name: "target_username", label: "Target username", default: "alice" }],
  },
  {
    key: "credential-stuffing",
    title: "Credential Stuffing",
    desc: "Failed logins across multiple usernames from a single attacker IP.",
    fields: [{ name: "usernames", label: "Usernames (comma-separated)", default: "alice,bob" }],
  },
  {
    key: "insider-threat",
    title: "Insider Threat",
    desc: "An existing user repeatedly accesses sensitive records and bulk-downloads files at 2 AM.",
    fields: [{ name: "username", label: "Username", default: "bob" }],
  },
  {
    key: "privilege-escalation",
    title: "Privilege Escalation",
    desc: "A user grants themselves admin rights, then mass-deletes records.",
    fields: [{ name: "username", label: "Username", default: "alice" }],
  },
  {
    key: "impossible-travel",
    title: "Impossible Travel",
    desc: "Same user logs in from two far-apart locations seconds apart.",
    fields: [{ name: "username", label: "Username", default: "bob" }],
  },
];

export default function Simulate() {
  const [values, setValues] = useState(
    Object.fromEntries(SCENARIOS.map((s) => [s.key, Object.fromEntries(s.fields.map((f) => [f.name, f.default]))]))
  );
  const [results, setResults] = useState({});
  const [running, setRunning] = useState("");

  function update(scenario, field, value) {
    setValues((v) => ({ ...v, [scenario]: { ...v[scenario], [field]: value } }));
  }

  async function run(scenario) {
    setRunning(scenario);
    try {
      const raw = values[scenario];
      const payload = { ...raw };
      if (payload.usernames) payload.usernames = payload.usernames.split(",").map((s) => s.trim());
      const result = await api.simulate(scenario, payload);
      setResults((r) => ({ ...r, [scenario]: result }));
    } catch (err) {
      setResults((r) => ({ ...r, [scenario]: { error: err?.response?.data?.detail || "failed" } }));
    } finally {
      setRunning("");
    }
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-slate-200">Attack Simulation Module</h2>
      <p className="text-slate-500 text-sm">
        Admin-only. Every simulated event runs through the real detection pipeline (rule-based +
        Isolation Forest/UBA) and raises real alerts — check the Dashboard / Alerts page right after
        running one.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCENARIOS.map((s) => (
          <div key={s.key} className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
            <div>
              <h3 className="text-slate-200 font-semibold">{s.title}</h3>
              <p className="text-slate-500 text-xs">{s.desc}</p>
            </div>
            {s.fields.map((f) => (
              <input
                key={f.name}
                placeholder={f.label}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
                value={values[s.key][f.name]}
                onChange={(e) => update(s.key, f.name, e.target.value)}
              />
            ))}
            <button
              onClick={() => run(s.key)}
              disabled={running === s.key}
              className="bg-red-500/80 hover:bg-red-500 text-slate-950 font-medium px-4 py-1.5 rounded text-sm self-start"
            >
              {running === s.key ? "Running..." : "Launch simulation"}
            </button>
            {results[s.key] && (
              <pre className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-400 overflow-x-auto">
                {JSON.stringify(results[s.key], null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
