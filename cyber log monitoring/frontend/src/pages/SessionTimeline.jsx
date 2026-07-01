import { useState } from "react";
import { api } from "../api/client";
import RiskBadge from "../components/RiskBadge";

export default function SessionTimeline() {
  const [sessionId, setSessionId] = useState("");
  const [events, setEvents] = useState(null);

  async function load() {
    if (!sessionId) return;
    setEvents(await api.sessionTimeline(sessionId));
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-slate-200">Session Timeline</h2>
      <p className="text-slate-500 text-sm">
        Visualize a single session as a sequence: Login → actions → Logout. Find a session ID in the
        Audit Trail search results.
      </p>

      <div className="flex gap-2">
        <input
          placeholder="Session ID"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 font-mono flex-1"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        />
        <button
          onClick={load}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium px-4 py-1.5 rounded text-sm"
        >
          Load
        </button>
      </div>

      {events && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-6">
          {events.length === 0 ? (
            <div className="text-slate-500 text-center">No events found for that session ID.</div>
          ) : (
            <ol className="relative border-l border-slate-700 ml-3 flex flex-col gap-6">
              {events.map((e) => (
                <li key={e.timestamp + e.event_type} className="ml-6">
                  <span className="absolute -left-[7px] flex h-3.5 w-3.5 rounded-full bg-cyan-400 ring-4 ring-slate-900" />
                  <div className="flex items-center gap-3">
                    <span className="text-slate-200 font-medium">{e.event_type}</span>
                    <RiskBadge score={e.risk_score} />
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {new Date(e.timestamp).toLocaleString()}
                  </div>
                  {e.details && <div className="text-slate-500 text-xs mt-1">{e.details}</div>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
