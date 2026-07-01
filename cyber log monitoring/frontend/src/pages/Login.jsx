import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <form
        onSubmit={onSubmit}
        className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <div className="text-center mb-2">
          <div className="text-2xl font-bold text-cyan-400">🛡️ SecAudit AI</div>
          <div className="text-slate-500 text-sm">Security Audit Log Monitoring & Threat Detection</div>
        </div>

        <label className="text-sm text-slate-400">
          Username
          <input
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="text-sm text-slate-400">
          Password
          <input
            type="password"
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <button
          disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold rounded py-2 mt-2"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-xs text-slate-500 text-center mt-2">
          Demo: admin / Admin@12345 (full access) · alice / Alice@12345 · bob / Bob@12345
        </div>
      </form>
    </div>
  );
}
