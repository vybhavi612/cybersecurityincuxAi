function classify(score) {
  if (score <= 30) return { label: "LOW", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (score <= 70) return { label: "MEDIUM", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  return { label: "HIGH", cls: "bg-red-500/15 text-red-400 border-red-500/30" };
}

export default function RiskBadge({ score }) {
  const { label, cls } = classify(score);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>
      {score} · {label}
    </span>
  );
}
