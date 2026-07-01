import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { useLiveFeed } from "../api/useLiveFeed";
import StatCard from "../components/StatCard";
import RiskBadge from "../components/RiskBadge";
import AlertLevelBadge from "../components/AlertLevelBadge";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [geo, setGeo] = useState([]);
  const live = useLiveFeed(50);

  async function refresh() {
    const [s, h, g] = await Promise.all([
      api.dashboardStats(),
      api.hourlyHeatmap(),
      api.geoDistribution(),
    ]);
    setStats(s);
    setHeatmap(h);
    setGeo(g);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const liveLogs = live.filter((e) => e.type === "log");
  const liveAlerts = live.filter((e) => e.type === "alert");

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        <StatCard label="Active Users" value={stats?.active_users ?? "—"} />
        <StatCard label="Active Sessions" value={stats?.active_sessions ?? "—"} />
        <StatCard
          label="Failed Logins (1h)"
          value={stats?.failed_logins_last_hour ?? "—"}
          accent="text-amber-400"
        />
        <StatCard label="Open Alerts" value={stats?.open_alerts ?? "—"} accent="text-orange-400" />
        <StatCard
          label="Critical Alerts"
          value={stats?.critical_alerts ?? "—"}
          accent="text-red-400"
        />
        <StatCard label="Events (24h)" value={stats?.events_last_24h ?? "—"} />
        <StatCard
          label="Threat Score"
          value={`${stats?.threat_score ?? "—"}/100`}
          accent={
            (stats?.threat_score ?? 0) > 70
              ? "text-red-400"
              : (stats?.threat_score ?? 0) > 30
              ? "text-amber-400"
              : "text-emerald-400"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4">
          <h3 className="text-slate-300 font-semibold mb-3">Login Activity Heatmap (by hour, 30d)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={heatmap}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
              <Bar dataKey="count" fill="#22d3ee" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4">
          <h3 className="text-slate-300 font-semibold mb-3">Top Source IPs (24h)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="py-1">IP Address</th>
                <th className="py-1">Event Count</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.top_ips ?? []).map((row) => (
                <tr key={row.ip_address} className="border-t border-slate-800">
                  <td className="py-1.5 text-slate-200 font-mono">{row.ip_address}</td>
                  <td className="py-1.5 text-slate-400">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4">
        <h3 className="text-slate-300 font-semibold mb-3">
          Activity by Region (7d) <span className="text-slate-500 text-xs">— feeds the geo/world-map view</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {geo.map((row) => (
            <div key={row.country} className="bg-slate-950 border border-slate-800 rounded p-3">
              <div className="text-slate-200 text-sm font-medium">{row.country}</div>
              <div className="text-cyan-400 text-xl font-bold">{row.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 max-h-80 overflow-y-auto">
          <h3 className="text-slate-300 font-semibold mb-3">Live Event Feed</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {liveLogs.map((e, i) => (
              <li key={i} className="flex justify-between items-center border-b border-slate-800/60 pb-1">
                <span className="text-slate-300">
                  {e.username ?? "—"} · {e.event_type}
                </span>
                <RiskBadge score={e.risk_score} />
              </li>
            ))}
            {liveLogs.length === 0 && <li className="text-slate-500">Waiting for live events...</li>}
          </ul>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 max-h-80 overflow-y-auto">
          <h3 className="text-slate-300 font-semibold mb-3">Live Alerts</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {liveAlerts.map((a, i) => (
              <li key={i} className="flex flex-col gap-1 border-b border-slate-800/60 pb-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">{a.alert_type}</span>
                  <AlertLevelBadge level={a.level} />
                </div>
                <span className="text-slate-500 text-xs">{a.message}</span>
              </li>
            ))}
            {liveAlerts.length === 0 && <li className="text-slate-500">No live alerts yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
