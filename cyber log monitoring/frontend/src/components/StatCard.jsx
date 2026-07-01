export default function StatCard({ label, value, accent = "text-cyan-400", sub }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 flex flex-col gap-1 min-w-[160px]">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`text-3xl font-semibold ${accent}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}
