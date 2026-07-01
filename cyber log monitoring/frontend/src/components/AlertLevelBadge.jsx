const LEVEL_STYLES = {
  INFO: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  LOW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse",
};

export default function AlertLevelBadge({ level }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${
        LEVEL_STYLES[level] || LEVEL_STYLES.INFO
      }`}
    >
      {level}
    </span>
  );
}
