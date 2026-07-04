"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, CheckCircle2, Clock3, Info, Loader2, TrendingUp, Wifi } from "lucide-react";
import {
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
import { Badge, Card, ProgressBar } from "@/components/ui/Card";
import {
  AttendanceRecord as UIRecord,
  attendanceHistory as mockHistory,
  attendanceTrend as mockTrend,
  calculateAttendancePercentage,
  getCurrentWeekAttendance,
  monthlyAttendance as mockMonthly,
} from "@/lib/studentPortalData";
import {
  apiFetch,
  getToken,
  AttendanceRecord as ApiRecord,
  buildWeekAttendance,
  buildMonthlyHeatmap,
  buildAttendanceTrend,
  buildAttendanceHistory,
} from "@/lib/apiClient";

export default function AttendancePage() {
  // ── State ──────────────────────────────────────────────────────────────
  const [weekAttendance, setWeekAttendance] = useState<UIRecord[]>(() => getCurrentWeekAttendance());
  const [monthlyAttendance, setMonthlyAttendance] = useState(mockMonthly);
  const [attendanceTrend, setAttendanceTrend] = useState(mockTrend);
  const [attendanceHistory, setAttendanceHistory] = useState(mockHistory);
  const [isLive, setIsLive] = useState(false);
  const [markingDate, setMarkingDate] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);
  const [justMarked, setJustMarked] = useState<string | null>(null);

  // ── Fetch all attendance data from API ─────────────────────────────────
  const loadAttendance = useCallback(async () => {
    const records = await apiFetch<ApiRecord[]>("/api/attendance?days=90");
    if (!records?.length) return;
    setWeekAttendance(buildWeekAttendance(records) as UIRecord[]);
    setMonthlyAttendance(buildMonthlyHeatmap(records));
    setAttendanceTrend(buildAttendanceTrend(records));
    setAttendanceHistory(buildAttendanceHistory(records));
    setIsLive(true);
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const attendancePercentage = calculateAttendancePercentage(weekAttendance);
  const markedCount = weekAttendance.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;

  const monthSummary = useMemo(() => {
    const present = monthlyAttendance.filter((r) => r.value > 0).length;
    return Math.round((present / monthlyAttendance.length) * 100);
  }, [monthlyAttendance]);

  // ── Mark attendance — saves to DB, then re-fetches to stay in sync ─────
  const markPresent = async (date: string) => {
    if (markingDate) return; // prevent double-tap
    setMarkingDate(date);
    setMarkError(null);

    try {
      const token = getToken();
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date,
          status: "PRESENT",
          loginTime: new Date().toISOString(),
          duration: 0,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMarkError(body?.error ?? "Failed to save. Please try again.");
        return;
      }

      // Optimistic UI update immediately
      setWeekAttendance((records) =>
        records.map((r) =>
          r.date === date ? { ...r, status: "PRESENT" as const } : r
        )
      );
      setJustMarked(date);
      setTimeout(() => setJustMarked(null), 3000);

      // Re-fetch full attendance so charts + heatmap + monthly % also update
      await loadAttendance();
    } catch {
      setMarkError("Network error. Check your connection and try again.");
    } finally {
      setMarkingDate(null);
    }
  };

  return (
    <DashboardLayout role="STUDENT">
      <div className="space-y-6">
        {/* Metric cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          <AttendanceMetric
            label="This Week"
            value={`${attendancePercentage}%`}
            detail={`${markedCount} days marked present`}
            icon={CalendarCheck}
            gradient="from-emerald-400 to-green-500"
            badge={attendancePercentage >= 80 ? "success" : "warning"}
            badgeLabel={attendancePercentage >= 80 ? "Good standing" : "Needs attention"}
          />
          <AttendanceMetric
            label="Monthly Summary"
            value={`${monthSummary}%`}
            detail={isLive ? "From your actual records" : "Based on last 30 days"}
            icon={TrendingUp}
            gradient="from-blue-400 to-indigo-500"
            badge={monthSummary >= 75 ? "success" : "warning"}
            badgeLabel={monthSummary >= 75 ? "Consistent" : "Improve"}
          />
          <AttendanceMetric
            label="Current Streak"
            value="4 days"
            detail="Keep it alive today"
            icon={Clock3}
            gradient="from-amber-400 to-orange-500"
            badge="info"
            badgeLabel="Active"
          />
        </section>

        {/* Connection / error banners */}
        {isLive && !markError && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <Wifi className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              Connected to database — attendance is saved permanently and visible to your admin.
            </p>
          </div>
        )}
        {markError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5">
            <Info className="h-4 w-4 text-rose-600" />
            <p className="text-sm font-medium text-rose-800">{markError}</p>
            <button type="button" onClick={() => setMarkError(null)} className="ml-auto text-rose-400 hover:text-rose-600">✕</button>
          </div>
        )}

        {/* Weekly table + bar chart */}
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Current Week</h2>
                <p className="mt-0.5 text-sm text-slate-500">Daily attendance status.</p>
              </div>
              <Badge type={attendancePercentage >= 80 ? "success" : "warning"}>{attendancePercentage}% present</Badge>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200/80">
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>Date</span><span>Day</span><span>Status</span><span className="text-right">Action</span>
              </div>
              {weekAttendance.map((record, idx) => (
                <div
                  key={record.date}
                  className={`grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 border-t border-slate-100 px-4 py-3 text-sm ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                >
                  <span className="font-semibold text-slate-900">
                    {new Date(`${record.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-slate-500">{record.day.slice(0, 3)}</span>
                  <StatusBadge status={record.status} />
                  <span className="flex justify-end">
                    {record.status === "UNMARKED" ? (
                      <button
                        type="button"
                        disabled={!!markingDate}
                        onClick={() => markPresent(record.date)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {markingDate === record.date ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
                        ) : (
                          <><Check className="h-3 w-3" /> Mark Present</>
                        )}
                      </button>
                    ) : record.status === "PRESENT" && justMarked === record.date ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Saved!
                      </span>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-400">
                        {record.status === "UPCOMING" ? "Upcoming" : record.status === "PRESENT" ? "✓ Present" : record.status === "LATE" ? "Late" : record.status === "ABSENT" ? "Absent" : "Locked"}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-slate-900">Weekly View</h2>
            <p className="mt-0.5 text-sm text-slate-500">Present days per scheduled week.</p>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceHistory} margin={{ left: -24, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 5]} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="present" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Monthly heatmap + trend */}
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <h2 className="text-base font-bold text-slate-900">Monthly Heatmap</h2>
            <p className="mt-0.5 text-sm text-slate-500">30-day attendance consistency view.</p>
            <div className="mt-5 grid grid-cols-10 gap-2">
              {monthlyAttendance.map((record, index) => (
                <div
                  key={index}
                  title={`${record.date}: ${record.value === 1 ? "Present" : record.value === 0.5 ? "Late" : "Absent"}`}
                  className={`aspect-square rounded-md transition hover:scale-110 ${
                    record.value === 1
                      ? "bg-emerald-500 shadow-sm shadow-emerald-200"
                      : record.value === 0.5
                        ? "bg-amber-400 shadow-sm shadow-amber-200"
                        : "bg-rose-300 shadow-sm shadow-rose-200"
                  }`}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-emerald-500" />Present</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-amber-400" />Late</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-rose-300" />Absent</span>
            </div>
            <div className="mt-5">
              <ProgressBar label="Monthly attendance" value={monthSummary} color="green" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Attendance Trend</h2>
                <p className="mt-0.5 text-sm text-slate-500">Percentage movement across recent weeks.</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrend} margin={{ left: -24, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Threshold info */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200/60 bg-blue-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-sm text-blue-800">
            Attendance above <strong>75%</strong> is required for exam eligibility. You are currently{" "}
            <strong>{attendancePercentage >= 75 ? "above" : "below"}</strong> the threshold.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function AttendanceMetric({ label, value, detail, icon: Icon, gradient, badge, badgeLabel }: {
  label: string; value: string; detail: string; icon: typeof CalendarCheck;
  gradient: string; badge: "success" | "warning" | "info"; badgeLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <Badge type={badge}>{badgeLabel}</Badge>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: UIRecord["status"] }) {
  const config: Record<UIRecord["status"], { type: "success" | "warning" | "danger" | "info"; label: string }> = {
    PRESENT: { type: "success", label: "Present" },
    LATE: { type: "warning", label: "Late" },
    ABSENT: { type: "danger", label: "Absent" },
    UNMARKED: { type: "info", label: "Unmarked" },
    UPCOMING: { type: "info", label: "Upcoming" },
  };
  const { type, label } = config[status];
  return <Badge type={type}>{label}</Badge>;
}
