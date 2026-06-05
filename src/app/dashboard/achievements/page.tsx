"use client";

import { useEffect, useState } from "react";
import { Lock, Star, Trophy, Wifi } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge, Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/apiClient";

interface DbAchievement {
  id: string;
  title: string;
  description?: string;
  badge: string;
  earnedAt: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
  progress?: number;
  category: "attendance" | "streak" | "performance" | "engagement";
  rarity: "common" | "rare" | "epic";
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "early_bird", title: "Early Bird", description: "Logged in before 8:30 AM for the first time.", emoji: "🌅", earned: false, category: "engagement", rarity: "common" },
  { id: "streak_7", title: "7 Day Streak", description: "Maintained 7 consecutive days of activity.", emoji: "🔥", earned: false, category: "streak", rarity: "common" },
  { id: "perfect_attendance", title: "Perfect Attendance", description: "Zero absences for an entire month.", emoji: "⭐", earned: false, progress: 72, category: "attendance", rarity: "rare" },
  { id: "streak_30", title: "30 Day Streak", description: "30 days of unbroken consistent activity.", emoji: "🚀", earned: false, progress: 13, category: "streak", rarity: "rare" },
  { id: "consistent_learner", title: "Consistent Learner", description: "Active and engaged for 3 consecutive months.", emoji: "📚", earned: false, progress: 45, category: "engagement", rarity: "epic" },
  { id: "top_performer", title: "Top Performer", description: "Achieved the highest productivity score in class.", emoji: "🏆", earned: false, progress: 61, category: "performance", rarity: "epic" },
  { id: "task_master", title: "Task Master", description: "Completed 20 tasks or assignments.", emoji: "✅", earned: false, progress: 35, category: "performance", rarity: "common" },
];

const TITLE_TO_ID: Record<string, string> = {
  "Early Bird": "early_bird",
  "7 Day Streak": "streak_7",
  "Perfect Attendance": "perfect_attendance",
  "Task Master": "task_master",
  "30 Day Streak": "streak_30",
};

const rarityConfig = {
  common: { label: "Common", color: "bg-slate-100 text-slate-600 border-slate-200" },
  rare: { label: "Rare", color: "bg-blue-100 text-blue-700 border-blue-200" },
  epic: { label: "Epic", color: "bg-violet-100 text-violet-700 border-violet-200" },
};

const categoryColors: Record<Achievement["category"], string> = {
  attendance: "from-emerald-400 to-green-500",
  streak: "from-rose-400 to-pink-500",
  performance: "from-amber-400 to-orange-500",
  engagement: "from-indigo-400 to-violet-500",
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>(ALL_ACHIEVEMENTS);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    apiFetch<DbAchievement[]>("/api/achievements").then((dbData) => {
      if (!dbData?.length) return;
      const earnedIds = new Set(
        dbData.map((a) => TITLE_TO_ID[a.title] ?? a.title.toLowerCase().replace(/\s+/g, "_"))
      );
      setAchievements((prev) =>
        prev.map((a) => (earnedIds.has(a.id) ? { ...a, earned: true, progress: undefined } : a))
      );
      setIsLive(true);
    });
  }, []);

  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  return (
    <DashboardLayout role="STUDENT">
      <div className="space-y-6">
        {/* Header banner */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-lg shadow-amber-500/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-100">Your trophy shelf</p>
              <h2 className="mt-1 text-2xl font-bold">Achievements</h2>
              <p className="mt-1.5 text-sm text-amber-100">Complete challenges to earn badges and unlock new milestones.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/20 px-5 py-3 backdrop-blur-sm">
              <Trophy className="h-6 w-6 text-amber-200" />
              <div>
                <p className="text-xs font-medium text-amber-100">Earned</p>
                <p className="text-2xl font-bold">{earned.length}<span className="text-lg font-normal text-amber-200">/{achievements.length}</span></p>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-amber-100">Collection progress</span>
              <span className="font-bold">{Math.round((earned.length / achievements.length) * 100)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${(earned.length / achievements.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <Wifi className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">Connected to database — showing your real earned badges.</p>
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Badges Earned" value={`${earned.length}`} detail={`${locked.length} remaining`} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Rarest Badge" value={earned.length > 0 ? earned[earned.length - 1].title : "None yet"} detail="Most recent" color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard
            label="Next to Unlock"
            value={locked[0]?.title ?? "All unlocked!"}
            detail={locked[0]?.progress !== undefined ? `${locked[0].progress}% there` : ""}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
        </section>

        {/* Earned */}
        {earned.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">Earned Badges</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{earned.length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {earned.map((a) => <EarnedBadge key={a.id} achievement={a} />)}
            </div>
          </div>
        )}

        {/* Locked */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-400" />
            <h2 className="text-base font-bold text-slate-900">In Progress</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{locked.length}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {locked.map((a) => <LockedBadge key={a.id} achievement={a} />)}
          </div>
        </div>

        {/* How it works */}
        <Card className="border-indigo-200/60 bg-indigo-50/50">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">How Achievements Work</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Badges are awarded automatically based on your real performance — attendance, streaks, assignment completion, and login activity. The more consistently you engage, the faster you unlock milestones.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["common", "rare", "epic"] as const).map((r) => (
                  <span key={r} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${rarityConfig[r].color}`}>
                    {rarityConfig[r].label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function EarnedBadge({ achievement: a }: { achievement: Achievement }) {
  const rarity = rarityConfig[a.rarity];
  return (
    <div className={`relative rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5 ${a.rarity === "epic" ? "border-violet-200" : a.rarity === "rare" ? "border-blue-200" : "border-slate-200/80"}`}>
      <div className="absolute right-3 top-3">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${rarity.color}`}>{rarity.label}</span>
      </div>
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${categoryColors[a.category]} text-3xl shadow-md`}>{a.emoji}</div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{a.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.description}</p>
      <div className="mt-3"><Badge type="success">Earned ✓</Badge></div>
    </div>
  );
}

function LockedBadge({ achievement: a }: { achievement: Achievement }) {
  const rarity = rarityConfig[a.rarity];
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5 transition hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${rarity.color}`}>{rarity.label}</span>
        <Lock className="h-4 w-4 text-slate-300" />
      </div>
      <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-3xl grayscale opacity-50">{a.emoji}</div>
      <h3 className="mt-4 text-sm font-bold text-slate-600">{a.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{a.description}</p>
      {a.progress !== undefined && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Progress</span>
            <span className="text-xs font-bold text-slate-600">{a.progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${a.progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, color, bg }: { label: string; value: string; detail: string; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 ${bg} p-5`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
