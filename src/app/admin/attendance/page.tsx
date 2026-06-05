"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wifi,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge, Card } from "@/components/ui/Card";
import { STUDENTS, DAILY_ATTENDANCE, WEEKLY_ATTENDANCE, AdminStudent, AttendanceDay } from "@/lib/adminPortalData";
import { apiFetch, AdminAttendanceOverview } from "@/lib/apiClient";

type RangeFilter = "7d" | "14d" | "30d";

const AUTO_REFRESH_MS = 30_000; // refresh every 30 s

export default function AdminAttendancePage() {
  const [range, setRange] = useState<RangeFilter>("14d");
  const [search, setSearch] = useState("");
  const [dailyData, setDailyData] = useState<AttendanceDay[]>(DAILY_ATTENDANCE);
  const [weeklyData, setWeeklyData] = useState(WEEKLY_ATTENDANCE);
  const [isLive, setIsLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const data = await apiFetch<AdminAttendanceOverview>("/api/admin/attendance?days=30");
    if (data) {
      if (data.daily.length) setDailyData(data.daily);
      if (data.weekly.length) setWeeklyData(data.weekly);
      setIsLive(true);
      setLastRefreshed(new Date());
    }
    if (!silent) setRefreshing(false);
  }, []);

  // Initial load + auto-refresh every 30 s
  useEffect(() => {
    fetchData(false);
    const timer = setInterval(() => fetchData(true), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;
  const dailySlice = dailyData.slice(-days);

  const totalPresent = dailySlice.reduce((s, d) => s + d.present, 0);
  const totalAbsent = dailySlice.reduce((s, d) => s + d.absent, 0);
  const totalLate = dailySlice.reduce((s, d) => s + d.late, 0);
  const totalSessions = dailySlice.reduce((s, d) => s + d.total, 0);
  const overallRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

  const lowAttendance = STUDENTS.filter((s) => s.attendancePercent < 75).sort((a, b) => a.attendancePercent - b.attendancePercent);
  const perfectAttendance = STUDENTS.filter((s) => s.attendancePercent >= 90);
  const atConsecutiveRisk = STUDENTS.filter((s) => s.currentStreak === 0 && s.status === "active");

  const filteredStudents = useMemo(() => {
    if (!search) return STUDENTS;
    const q = search.toLowerCase();
    return STUDENTS.filter((s) => s.name.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q));
  }, [search]);

  return (
    <DashboardLayout role="ADMIN">
      <div className="space-y-6">
        {/* KPI cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AttKPI label="Overall Rate" value={`${overallRate}%`} sub={`Last ${days} days`} icon={TrendingUp} gradient="from-emerald-400 to-green-500" />
          <AttKPI label="Total Present" value={totalPresent} sub="Session records" icon={CheckCircle2} gradient="from-blue-400 to-indigo-500" />
          <AttKPI label="Total Absent" value={totalAbsent} sub="Missed sessions" icon={XCircle} gradient="from-rose-400 to-red-500" />
          <AttKPI label="Late Arrivals" value={totalLate} sub="Partial credit" icon={Clock} gradient="from-amber-400 to-orange-500" />
        </section>

        {/* Date range selector + summary */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">Attendance Overview</h2>
            {isLive && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <Wifi className="h-3 w-3" /> Live
              </div>
            )}
            {lastRefreshed && (
              <span className="text-xs text-slate-400">
                Updated {lastRefreshed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fetchData(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {(["7d", "14d", "30d"] as RangeFilter[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  range === r ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r === "7d" ? "7 Days" : r === "14d" ? "14 Days" : "30 Days"}
              </button>
            ))}
          </div>
        </div>

        {/* Daily chart + weekly breakdown */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daily Attendance</h3>
                <p className="mt-0.5 text-xs text-slate-400">Present, Late, Absent per session day</p>
              </div>
            </div>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySlice} margin={{ left: -24, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} tick={{ fill: "#94a3b8" }} />
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
            <h3 className="text-sm font-bold text-slate-900">Weekly Summary</h3>
            <p className="mt-0.5 text-xs text-slate-400 mb-4">Avg per 20 students</p>
            <div className="space-y-3">
              {weeklyData.map((w) => {
                const rate = Math.round((w.present / (w.present + w.late + w.absent)) * 100);
                return (
                  <div key={w.week}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">{w.week}</span>
                      <span className={`font-bold ${rate >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{rate}%</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="bg-emerald-500" style={{ width: `${(w.present / 20) * 100}%` }} />
                      <div className="bg-amber-400" style={{ width: `${(w.late / 20) * 100}%` }} />
                      <div className="bg-rose-400" style={{ width: `${(w.absent / 20) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="mt-3 flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Present</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Late</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />Absent</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Risk monitoring */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Low attendance */}
          <Card className="border-rose-200/60">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">Low Attendance</h3>
              <Badge type="danger">{lowAttendance.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 mb-3">Students below 75% threshold</p>
            <div className="space-y-2.5">
              {lowAttendance.slice(0, 5).map((s) => (
                <RiskStudentRow key={s.id} student={s} valueLabelFn={(s) => `${s.attendancePercent}%`} badgeType="danger" />
              ))}
              {lowAttendance.length === 0 && <p className="text-sm text-emerald-600">All students above threshold ✓</p>}
            </div>
          </Card>

          {/* No streak / inactive */}
          <Card className="border-amber-200/60">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">No Active Streak</h3>
              <Badge type="warning">{atConsecutiveRisk.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 mb-3">Students with zero streak (risk of dropout)</p>
            <div className="space-y-2.5">
              {atConsecutiveRisk.slice(0, 5).map((s) => (
                <RiskStudentRow key={s.id} student={s} valueLabelFn={(s) => `${s.attendancePercent}% att.`} badgeType="warning" />
              ))}
              {atConsecutiveRisk.length === 0 && <p className="text-sm text-emerald-600">All students engaged ✓</p>}
            </div>
          </Card>

          {/* Perfect attendance */}
          <Card className="border-emerald-200/60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900">Perfect Attendance</h3>
              <Badge type="success">{perfectAttendance.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 mb-3">Students at 90%+ attendance</p>
            <div className="space-y-2.5">
              {perfectAttendance.slice(0, 5).map((s) => (
                <RiskStudentRow key={s.id} student={s} valueLabelFn={(s) => `${s.attendancePercent}%`} badgeType="success" />
              ))}
            </div>
          </Card>
        </section>

        {/* Student attendance table */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-bold text-slate-900">Individual Attendance</h3>
            <input
              type="text"
              placeholder="Search student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-52"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {["Student", "Branch", "Attendance %", "Streak", "Last Active", "Risk"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${s.avatarColor} text-xs font-bold text-white`}>{s.initials}</div>
                        <span className="font-medium text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.branch}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${s.attendancePercent < 75 ? "text-rose-600" : s.attendancePercent >= 90 ? "text-emerald-600" : "text-slate-900"}`}>
                          {s.attendancePercent}%
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full rounded-full ${s.attendancePercent < 75 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${s.attendancePercent}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.currentStreak}d</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(s.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="px-4 py-3">
                      <Badge type={s.riskLevel === "low" ? "success" : s.riskLevel === "medium" ? "warning" : "danger"}>
                        {s.riskLevel}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function AttKPI({ label, value, sub, icon: Icon, gradient }: { label: string; value: string | number; sub: string; icon: typeof TrendingUp; gradient: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function RiskStudentRow({
  student,
  valueLabelFn,
  badgeType,
}: {
  student: AdminStudent;
  valueLabelFn: (s: AdminStudent) => string;
  badgeType: "success" | "warning" | "danger";
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${student.avatarColor} text-xs font-bold text-white`}>
        {student.initials}
      </div>
      <p className="flex-1 truncate text-sm font-medium text-slate-900">{student.name}</p>
      <Badge type={badgeType}>{valueLabelFn(student)}</Badge>
    </div>
  );
}
