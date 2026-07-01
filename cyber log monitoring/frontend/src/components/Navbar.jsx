import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/audit-trail", label: "Audit Trail" },
  { to: "/alerts", label: "Alerts" },
  { to: "/sessions", label: "Session Timeline" },
  { to: "/simulate", label: "Attack Simulator" },
];

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-slate-950 border-b border-slate-800">
      <div className="flex items-center gap-6">
        <span className="text-cyan-400 font-bold tracking-tight">🛡️ SecAudit AI</span>
        <div className="flex gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium ${
                  isActive ? "bg-cyan-500/15 text-cyan-400" : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <span>
          {user?.username} <span className="text-slate-600">({user?.role})</span>
        </span>
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
