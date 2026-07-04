"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
  Wifi,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge, Card, ProgressBar } from "@/components/ui/Card";
import {
  assignments,
  attendanceTrend as mockTrend,
  calculateAttendancePercentage,
  calculateProductivityScore,
  getAssignmentStats,
  getCurrentWeekAttendance,
  getProductivityCategory,
  getRemainingTime,
} from "@/lib/studentPortalData";
import {
  apiFetch,
  getCurrentUser,
  StudentAnalytics,
  AttendanceRecord,
  buildAttendanceTrend,
} from "@/lib/apiClient";

const timelinessRate = 72;

export default function StudentDashboard() {
  // ── Mock baseline (renders immediately) ───────────────────────────────
  const attendanceRecords = getCurrentWeekAttendance();
  const mockAttendancePct = calculateAttendancePercentage(attendanceRecords);
  const assignmentStats = getAssignmentStats(assignments);
  const mockStreak = 4;
  const nextAssignment = assignments.find((a) => a.status !== "Submitted");

  // ── Real data from API ─────────────────────────────────────────────────
  const [apiData, setApiData] = useState<StudentAnalytics | null>(null);
  const [attendanceTrend, setAttendanceTrend] = useState(mockTrend);
  const [isLive, setIsLive] = useState(false);
  const currentUser = typeof window !== "undefined" ? getCurrentUser() : null;

  useEffect(() => {
    apiFetch<StudentAnalytics>("/api/analytics").then((data) => {
      if (data) {
        setApiData(data);
        setIsLive(true);
      }
    });
    apiFetch<AttendanceRecord[]>("/api/attendance?days=60").then((records) => {
      if (records?.length) setAttendanceTrend(buildAttendanceTrend(records));
    });
  }, []);

  // Merge: prefer real data, fall back to mock
  const attendancePct = apiData?.attendancePercentage ?? mockAttendancePct;
  const streak = apiData?.currentStreak ?? mockStreak;
  const productivityScore =
    apiData?.productivityScore ??
    calculateProductivityScore({
      attendancePercentage: attendancePct,
      assignmentCompletionRate: assignmentStats.completionPercentage,
      currentStreak: streak,
      timelinessRate,
    });
  const productivityCategory = getProductivityCategory(productivityScore);
  const studentName = currentUser?.name ?? "Student";

  return (
    <DashboardLayout role="STUDENT">
      <div className="space-y-6">
        {/* Greeting banner */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-200">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <h2 className="mt-1 text-2xl font-bold">Welcome back, {studentName.split(" ")[0]} 👋</h2>
              <p className="mt-1.5 text-sm text-indigo-200">Spring Term · CS Semester 4</p>
            </div>
            <div className="flex items-center gap-3">
              {isLive && (
                <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                  <Wifi className="h-3.5 w-3.5 text-emerald-300" />
                  Live
                </div>
              )}
              <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
                <Flame className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="text-xs text-indigo-200">Current streak</p>
                  <p className="text-lg font-bold">{streak} days</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI metric cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Today"
            value={new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            detail={new Date().toLocaleDateString("en-US", { weekday: "long" })}
            icon={CalendarDays}
            gradient="from-sky-400 to-cyan-500"
          />
          <MetricCard label="Streak" value={`${streak} days`} detail="2 days above avg" icon={Flame} gradient="from-rose-400 to-pink-500" />
          <MetricCard label="Attendance" value={`${attendancePct}%`} detail="Highest score weight" icon={CheckCircle2} gradient="from-emerald-400 to-green-500" />
          <MetricCard
            label="Assignments"
            value={`${assignmentStats.completionPercentage}%`}
            detail={`${assignmentStats.completed}/${assignmentStats.total} submitted`}
            icon={ListChecks}
            gradient="from-amber-400 to-orange-500"
          />
          <MetricCard label="Score" value={`${productivityScore}/100`} detail={productivityCategory.label} icon={Gauge} gradient="from-indigo-400 to-violet-500" />
        </section>

        {/* Productivity score + Priority actions */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Productivity score</p>
                <h2 className="mt-1.5 text-xl font-bold text-slate-900">Attendance-led performance index</h2>
              </div>
              <Badge type={productivityCategory.tone}>{productivityCategory.label}</Badge>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-[13rem_1fr]">
              <div className="flex items-center justify-center">
                <div
                  className="grid h-48 w-48 place-items-center rounded-full shadow-inner"
                  style={{ background: `conic-gradient(#6366f1 ${productivityScore * 3.6}deg, #e2e8f0 0deg)` }}
                >
                  <div className="grid h-36 w-36 place-items-center rounded-full bg-white shadow-sm text-center">
                    <div>
                      <p className="text-4xl font-bold text-slate-900">{productivityScore}</p>
                      <p className="text-xs text-slate-500 font-medium">out of 100</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <ProgressBar label="Attendance contribution" value={attendancePct} color="green" />
                <ProgressBar label="Assignment completion" value={assignmentStats.completionPercentage} color="blue" />
                <ProgressBar label="Consistency & streak" value={Math.min(streak * 10, 100)} color="yellow" />
                <ProgressBar label="Submission timeliness" value={timelinessRate} color="red" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Priority Actions</h2>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                <Target className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <ActionRow title="Mark today's attendance" detail="Still unmarked for today." icon={CalendarDays} accentColor="bg-emerald-500" />
              <ActionRow
                title={nextAssignment ? nextAssignment.title : "Review submissions"}
                detail={nextAssignment ? getRemainingTime(nextAssignment.dueDate, nextAssignment.status) : "No pending deadlines."}
                icon={Clock3}
                accentColor="bg-blue-500"
              />
              <ActionRow title="Protect your streak" detail="One active day keeps momentum alive." icon={Flame} accentColor="bg-rose-500" />
            </div>
            <a href="/dashboard/assignments" className="mt-4 flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View all tasks <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </Card>
        </section>

        {/* Assignment progress + Attendance trend */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Assignment Progress</h2>
                <p className="mt-0.5 text-sm text-slate-500">Completion across active coursework.</p>
              </div>
              <Badge type={assignmentStats.overdue > 0 ? "danger" : "success"}>
                {assignmentStats.overdue > 0 ? `${assignmentStats.overdue} overdue` : "On track"}
              </Badge>
            </div>
            <div className="mt-5">
              <ProgressBar label="Overall completion" value={assignmentStats.completionPercentage} color="blue" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <SummaryTile label="Completed" value={assignmentStats.completed} color="bg-emerald-50 text-emerald-700" />
              <SummaryTile label="Pending" value={assignmentStats.pending} color="bg-amber-50 text-amber-700" />
              <SummaryTile label="Total" value={assignmentStats.total} color="bg-slate-50 text-slate-700" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Attendance Trend</h2>
                <p className="mt-0.5 text-sm text-slate-500">Weekly attendance over recent sessions.</p>
              </div>
              <div className="flex items-center gap-2">
                {isLive && <span className="text-xs font-medium text-emerald-600">Live</span>}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend} margin={{ left: -28, right: 8, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attendanceFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }} />
                  <Area type="monotone" dataKey="percentage" stroke="#059669" strokeWidth={2.5} fill="url(#attendanceFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* AI Insights */}
        <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-violet-50 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl flex-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-base font-bold text-slate-900">AI Insights</h2>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InsightCard text="Attendance is the biggest score driver — mark today before focusing on coursework." />
                <InsightCard text="The overdue OS case study is creating the most assignment risk right now." />
                <InsightCard text="Submitting the lab report on time lifts both completion and timeliness signals." />
              </div>
            </div>
            <div className="w-full rounded-xl border border-indigo-200/60 bg-white p-4 shadow-sm md:w-56">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <p className="text-sm font-semibold text-slate-900">Next best move</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Mark attendance, then tackle the highest-priority pending task.
              </p>
              <a href="/dashboard/analytics" className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View analytics <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, detail, icon: Icon, gradient }: { label: string; value: string; detail: string; icon: typeof CalendarDays; gradient: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-right text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ActionRow({ title, detail, icon: Icon, accentColor }: { title: string; detail: string; icon: typeof CalendarDays; accentColor: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
      <div className={`mt-0.5 h-8 w-1 shrink-0 rounded-full ${accentColor}`} />
      <div className="flex flex-1 min-w-0 items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 text-center ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

function InsightCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">{text}</div>
  );
}
