"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Gauge,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Wifi,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge, Card } from "@/components/ui/Card";
import {
  getAdminStats,
  RECENT_ACTIVITIES,
  WEEKLY_ATTENDANCE,
  PRODUCTIVITY_TREND,
  ASSIGNMENT_TREND,
  RecentActivity,
} from "@/lib/adminPortalData";
import { apiFetch, AdminAnalytics } from "@/lib/apiClient";

const mockStats = getAdminStats();

const activityConfig: Record<RecentActivity["type"], { color: string; icon: string }> = {
  submit: { color: "bg-emerald-100 text-emerald-700", icon: "✓" },
  attend: { color: "bg-blue-100 text-blue-700", icon: "📅" },
  register: { color: "bg-violet-100 text-violet-700", icon: "+" },
  miss: { color: "bg-rose-100 text-rose-700", icon: "!" },
  login: { color: "bg-slate-100 text-slate-700", icon: "→" },
};

export default function AdminDashboard() {
  const [apiData, setApiData] = useState<AdminAnalytics | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState("");

  const fetchStats = useCallback(async () => {
    const data = await apiFetch<AdminAnalytics>("/api/analytics?type=admin");
    if (data) {
      setApiData(data);
      setIsLive(true);
      setLastRefreshed(new Date());
    }
  }, []);

  // Initial fetch + auto-refresh every 30 s to pick up new student attendance
  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 30_000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  // Merge: prefer real data, fall back to mock
  const stats = {
    totalStudents: apiData?.totalStudents ?? mockStats.totalStudents,
    presentToday: apiData?.presentToday ?? mockStats.presentToday,
    avgAttendance: apiData?.averageAttendance ?? mockStats.avgAttendance,
    avgProductivity: apiData?.averageProductivity ?? mockStats.avgProductivity,
    atRiskCount: apiData?.atRiskStudents ?? mockStats.atRiskCount,
    activeAssignments: mockStats.activeAssignments,
    topPerformers: mockStats.topPerformers,
    atRiskStudents: mockStats.atRiskStudents,
    mediumRiskCount: mockStats.mediumRiskCount,
  };

  const fetchAIInsights = async () => {
    setLoadingAI(true);
    setAiError("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      const res = await fetch("/api/admin/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: "dashboard",
          context: {
            totalStudents: stats.totalStudents,
            presentToday: stats.presentToday,
            avgAttendance: stats.avgAttendance,
            avgProductivity: stats.avgProductivity,
            atRiskCount: stats.atRiskCount,
            assignmentsActive: stats.activeAssignments,
            atRiskNames: stats.atRiskStudents.map((s) => s.name),
            topPerformerNames: stats.topPerformers.map((s) => s.name),
          },
        }),
      });
      const data = await res.json();
      setAiInsights(Array.isArray(data.data) ? data.data : [data.data ?? "No insights available."]);
    } catch {
      setAiError("Could not load AI insights.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <DashboardLayout role="ADMIN">
      <div className="space-y-6">
        {/* Welcome header */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
              <h2 className="mt-1 text-2xl font-bold">Admin Dashboard</h2>
              <p className="mt-1.5 text-sm text-slate-400">{stats.totalStudents} students · Spring Term 2026</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5">
                {isLive
                  ? <><Wifi className="h-4 w-4 text-emerald-400" /><span className="text-sm font-medium text-emerald-300">Live Data</span></>
                  : <><div className="h-2 w-2 rounded-full bg-amber-400" /><span className="text-sm font-medium">Demo</span></>
                }
              </div>
              {lastRefreshed && (
                <span className="text-xs text-slate-500">
                  Updated {lastRefreshed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <AdminKPI label="Total Students" value={stats.totalStudents} icon={Users} gradient="from-indigo-400 to-violet-500" detail="Enrolled" />
          <AdminKPI label="Present Today" value={stats.presentToday} icon={CalendarCheck} gradient="from-emerald-400 to-green-500" detail={`of ${stats.totalStudents}`} />
          <AdminKPI label="Avg Attendance" value={`${stats.avgAttendance}%`} icon={TrendingUp} gradient="from-blue-400 to-sky-500" detail="Last 30 days" />
          <AdminKPI label="Avg Productivity" value={`${stats.avgProductivity}/100`} icon={Gauge} gradient="from-amber-400 to-orange-500" detail="Class average" />
          <AdminKPI label="Active Assignments" value={stats.activeAssignments} icon={BookOpen} gradient="from-violet-400 to-purple-500" detail="Open tasks" />
          <AdminKPI label="At-Risk Students" value={stats.atRiskCount} icon={AlertTriangle} gradient="from-rose-400 to-red-500" detail={`${stats.mediumRiskCount} medium risk`} highlight={stats.atRiskCount > 0} />
        </section>

        {/* Charts row */}
        <section className="grid gap-6 lg:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Attendance</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">Weekly Attendance</h3>
              </div>
              <Activity className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEKLY_ATTENDANCE} margin={{ left: -28, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
                  <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
                  <Bar dataKey="absent" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Productivity</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">Average Score</h3>
              </div>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PRODUCTIVITY_TREND} margin={{ left: -28, right: 4, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="prodGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} domain={[60, 85]} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Area type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2.5} fill="url(#prodGrad)" name="Avg Score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Assignments</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">Completion Rate</h3>
              </div>
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ASSIGNMENT_TREND} margin={{ left: -28, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} domain={[65, 90]} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }} name="% Complete" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Students + Activity */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Top Performers</h3>
                <Link href="/admin/students" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {stats.topPerformers.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-slate-400">#{i + 1}</span>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${s.avatarColor} text-xs font-bold text-white`}>{s.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.branch} · {s.semester}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-600">{s.productivityScore}</p>
                      <p className="text-xs text-slate-400">{s.attendancePercent}% att.</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-rose-200/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-slate-900">At-Risk Students</h3>
                  <Badge type="danger">{stats.atRiskCount}</Badge>
                </div>
                <Link href="/admin/reports" className="text-xs font-semibold text-rose-600 hover:text-rose-700">View report</Link>
              </div>
              <div className="mt-4 space-y-3">
                {stats.atRiskStudents.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl bg-rose-50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">{s.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-rose-600">Attendance: {s.attendancePercent}% · Score: {s.productivityScore}</p>
                    </div>
                    <Badge type="danger">High Risk</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
              <span className="text-xs text-slate-400">Live feed</span>
            </div>
            <div className="mt-4 space-y-3">
              {RECENT_ACTIVITIES.map((activity) => {
                const config = activityConfig[activity.type];
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${config.color}`}>{config.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        <span className="font-semibold">{activity.studentName}</span>{" "}
                        <span className="text-slate-600">{activity.action}</span>
                      </p>
                      {activity.details && <p className="mt-0.5 text-xs text-slate-400">{activity.details}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Gemini AI Panel */}
        <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-violet-50 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Gemini AI Insights</h3>
                <p className="text-sm text-slate-500">Powered by Google Gemini · Click to generate</p>
              </div>
            </div>
            <button type="button" onClick={fetchAIInsights} disabled={loadingAI} className="flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${loadingAI ? "animate-spin" : ""}`} />
              {loadingAI ? "Analyzing…" : "Generate Insights"}
            </button>
          </div>

          {aiError && <p className="mt-4 text-sm text-rose-600">{aiError}</p>}

          {aiInsights.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {aiInsights.map((insight, i) => (
                <div key={i} className="rounded-xl border border-indigo-100 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
                  <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">{i + 1}</div>
                  {insight}
                </div>
              ))}
            </div>
          )}

          {aiInsights.length === 0 && !loadingAI && !aiError && (
            <div className="mt-5 rounded-xl border border-dashed border-indigo-200 bg-white/50 p-6 text-center">
              <p className="text-sm text-slate-400">Click "Generate Insights" to get AI-powered analysis of your class performance.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function AdminKPI({ label, value, icon: Icon, gradient, detail, highlight = false }: { label: string; value: string | number; icon: typeof Users; gradient: string; detail: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${highlight ? "border-rose-200/80 bg-rose-50/40" : "border-slate-200/80 bg-white"}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
