import { useEffect, useState } from "react";
import { api } from "../api/client";
import AlertLevelBadge from "../components/AlertLevelBadge";

const LEVELS = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED"];

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    const params = {};
    if (level) params.level = level;
    if (status) params.status = status;
    setAlerts(await api.listAlerts(params));
  }

  useEffect(() => {
    load();
  }, [level, status]);

  async function setAlertStatus(id, newStatus) {
    await api.updateAlert(id, { status: newStatus, acknowledged: newStatus !== "OPEN" });
    load();
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-200">Alert Management</h2>
        <div className="flex gap-2">
          <select
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Any level</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 flex items-start justify-between gap-4"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <AlertLevelBadge level={a.level} />
                <span className="text-slate-200 font-medium">{a.alert_type}</span>
                <span className="text-slate-500 text-xs">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
              <div className="text-slate-400 text-sm">{a.message}</div>
              <div className="text-slate-500 text-xs">
                user: {a.username ?? "—"} · ip: {a.ip_address ?? "—"} · log #{a.related_log_id ?? "—"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-slate-500">{a.status}</span>
              <select
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                value={a.status}
                onChange={(e) => setAlertStatus(a.id, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {alerts.length === 0 && <div className="text-slate-500 text-center py-8">No alerts found.</div>}
      </div>
    </div>
  );
}
