import { useEffect, useState } from "react";
import { api } from "../api/client";
import RiskBadge from "../components/RiskBadge";

const EVENT_TYPES = [
  "LOGIN",
  "LOGOUT",
  "FAILED_LOGIN",
  "PASSWORD_CHANGE",
  "FILE_UPLOAD",
  "FILE_DOWNLOAD",
  "DATA_CREATE",
  "DATA_MODIFY",
  "DATA_DELETE",
  "ADMIN_ACTION",
  "ACCOUNT_CREATE",
  "ACCOUNT_DEACTIVATE",
  "PRIVILEGE_CHANGE",
  "BULK_EXPORT",
  "SENSITIVE_ACCESS",
  "VIEW_DASHBOARD",
];

const emptyFilters = {
  username: "",
  event_type: "",
  ip_address: "",
  location: "",
  min_risk: "",
  max_risk: "",
  start_date: "",
  end_date: "",
};

export default function AuditTrail() {
  const [filters, setFilters] = useState(emptyFilters);
  const [logs, setLogs] = useState([]);
  const [chainStatus, setChainStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "")
      );
      const data = await api.searchLogs(params);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }

  async function checkChain() {
    setChainStatus(await api.verifyChain());
  }

  useEffect(() => {
    search();
  }, []);

  function update(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-200">Audit Trail Search</h2>
        <button
          onClick={checkChain}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded"
        >
          Verify tamper-evident hash chain
        </button>
      </div>

      {chainStatus && (
        <div
          className={`text-sm rounded px-3 py-2 border ${
            chainStatus.valid
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {chainStatus.valid
            ? `✓ Chain intact across ${chainStatus.checked} entries — no tampering detected.`
            : `✗ Tampering detected at log #${chainStatus.tampered_log_id}!`}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/70 border border-slate-800 rounded-lg p-4">
        <input
          placeholder="Username"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
          value={filters.username}
          onChange={(e) => update("username", e.target.value)}
        />
        <select
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
          value={filters.event_type}
          onChange={(e) => update("event_type", e.target.value)}
        >
          <option value="">Any event type</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          placeholder="IP Address"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
          value={filters.ip_address}
          onChange={(e) => update("ip_address", e.target.value)}
        />
        <input
          placeholder="Location"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
          value={filters.location}
          onChange={(e) => update("location", e.target.value)}
        />
        <input
          type="number"
          placeholder="Min risk"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
          value={filters.min_risk}
          onChange={(e) => update("min_risk", e.target.value)}
        />
        <input
          type="number"
          placeholder="Max risk"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
          value={filters.max_risk}
          onChange={(e) => update("max_risk", e.target.value)}
        />
        <input
          type="datetime-local"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
          value={filters.start_date}
          onChange={(e) => update("start_date", e.target.value)}
        />
        <input
          type="datetime-local"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100"
          value={filters.end_date}
          onChange={(e) => update("end_date", e.target.value)}
        />
        <div className="col-span-2 md:col-span-4 flex gap-2">
          <button
            onClick={search}
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium px-4 py-1.5 rounded text-sm"
          >
            {loading ? "Searching..." : "Search"}
          </button>
          <button
            onClick={() => {
              setFilters(emptyFilters);
              search();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-left border-b border-slate-800">
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">User</th>
              <th className="py-2 px-3">Event</th>
              <th className="py-2 px-3">IP</th>
              <th className="py-2 px-3">Location</th>
              <th className="py-2 px-3">Session</th>
              <th className="py-2 px-3">Risk</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                <td className="py-1.5 px-3 text-slate-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="py-1.5 px-3 text-slate-200">{log.username}</td>
                <td className="py-1.5 px-3 text-slate-300">{log.event_type}</td>
                <td className="py-1.5 px-3 text-slate-400 font-mono">{log.ip_address}</td>
                <td className="py-1.5 px-3 text-slate-400">{log.location}</td>
                <td className="py-1.5 px-3 text-slate-500 font-mono text-xs">{log.session_id ?? "—"}</td>
                <td className="py-1.5 px-3">
                  <RiskBadge score={log.risk_score} />
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  No matching log entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
