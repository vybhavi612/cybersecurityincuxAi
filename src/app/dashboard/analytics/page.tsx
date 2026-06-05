"use client";

import { useEffect, useState } from "react";
import { Activity, BookOpen, CalendarCheck, Gauge, Lightbulb, TrendingUp, Wifi } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  RadialBar,
  RadialBarChart,
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
} from "@/lib/studentPortalData";
import {
  apiFetch,
  StudentAnalytics,
  AttendanceRecord,
  buildAttendanceTrend,
} from "@/lib/apiClient";

const subjectPerformance = [
  { subject: "Data Structures", score: 88, attendance: 92, color: "#6366f1" },
  { subject: "Machine Learning", score: 76, attendance: 85, color: "#8b5cf6" },
  { subject: "Operating Systems", score: 62, attendance: 78, color: "#ec4899" },
  { subject: "Database Systems", score: 94, attendance: 96, color: "#10b981" },
  { subject: "Professional Comm.", score: 82, attendance: 90, color: "#f59e0b" },
];

const weeklyStudyHours = [
  { week: "Wk 1", hours: 12 }, { week: "Wk 2", hours: 18 }, { week: "Wk 3", hours: 9 },
  { week: "Wk 4", hours: 22 }, { week: "Wk 5", hours: 16 }, { week: "Wk 6", hours: 19 },
];

export default function AnalyticsPage() {
  // Mock baseline
  const attendance = getCurrentWeekAttendance();
  const assignmentStats = getAssignmentStats(assignments);
  const mockAttendancePct = calculateAttendancePercentage(attendance);
  const mockScore = calculateProductivityScore({
    attendancePercentage: mockAttendancePct,
    assignmentCompletionRate: assignmentStats.completionPercentage,
    currentStreak: 4,
    timelinessRate: 72,
  });
  const mockCategory = getProductivityCategory(mockScore);

  // Live data
  const [apiData, setApiData] = useState<StudentAnalytics | null>(null);
  const [trend, setTrend] = useState(mockTrend);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    apiFetch<StudentAnalytics>("/api/analytics").then((data) => {
      if (data) { setApiData(data); setIsLive(true); }
    });
    apiFetch<AttendanceRecord[]>("/api/attendance?days=60").then((records) => {
      if (records?.length) setTrend(buildAttendanceTrend(records));
    });
  }, []);

  const attendancePct = apiData?.attendancePercentage ?? mockAttendancePct;
  const score = apiData?.productivityScore ?? mockScore;
  const streak = apiData?.currentStreak ?? 4;
  const category = apiData ? getProductivityCategory(score) : mockCategory;

  const scoreBreakdown = [
    { label: "Attendance", value: attendancePct, weight: "45%", color: "green" as const, icon: CalendarCheck },
    { label: "Assignment Completion", value: assignmentStats.completionPercentage, weight: "25%", color: "blue" as const, icon: BookOpen },
    { label: "Streak Consistency", value: Math.min(streak * 10, 100), weight: "20%", color: "yellow" as const, icon: Activity },
    { label: "Submission Timeliness", value: 72, weight: "10%", color: "red" as const, icon: TrendingUp },
  ];

  return (
    <DashboardLayout role="STUDENT">
      <div className="space-y-6">
        {/* KPI cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnalyticsStat label="Productivity Score" value={`${score}/100`} badge={category.tone} badgeLabel={category.label} gradient="from-indigo-400 to-violet-500" icon={Gauge} />
          <AnalyticsStat label="Attendance Rate" value={`${attendancePct}%`} badge={attendancePct >= 80 ? "success" : "warning"} badgeLabel={attendancePct >= 80 ? "On track" : "Improve"} gradient="from-emerald-400 to-green-500" icon={CalendarCheck} />
          <AnalyticsStat label="Assignment Rate" value={`${assignmentStats.completionPercentage}%`} badge={assignmentStats.completionPercentage >= 70 ? "success" : "warning"} badgeLabel={`${assignmentStats.completed}/${assignmentStats.total} done`} gradient="from-blue-400 to-sky-500" icon={BookOpen} />
          <AnalyticsStat label="Avg Subject Score" value={`${Math.round(subjectPerformance.reduce((s, i) => s + i.score, 0) / subjectPerformance.length)}%`} badge="info" badgeLabel="5 subjects" gradient="from-amber-400 to-orange-500" icon={Activity} />
        </section>

        {isLive && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <Wifi className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">Connected to database — attendance and productivity from your real records.</p>
          </div>
        )}

        {/* Score breakdown + Attendance trend */}
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Breakdown</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Score Components</h2>
              </div>
              <div className="h-20 w-20 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ name: "Score", value: score, fill: "#6366f1" }]} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" background={{ fill: "#f1f5f9" }} cornerRadius={8} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={700} fill="#0f172a">{score}</text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {scoreBreakdown.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-xs text-slate-400">weight {item.weight}</span>
                    </div>
                    <ProgressBar label="" value={item.value} color={item.color} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Trend</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Attendance Over Time</h2>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -24, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsAttendance" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <Area type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2.5} fill="url(#analyticsAttendance)" dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Subject performance + Weekly hours */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Subjects</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">Performance by Subject</h2>
            </div>
            <div className="mt-5 space-y-4">
              {subjectPerformance.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{s.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{s.attendance}% att.</span>
                      <span className="text-sm font-bold text-slate-900">{s.score}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${s.score}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Effort</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Weekly Study Hours</h2>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyStudyHours} margin={{ left: -24, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                    {weeklyStudyHours.map((_, i) => (
                      <Cell key={i} fill={i === weeklyStudyHours.length - 2 ? "#6366f1" : "#c7d2fe"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Recommendations */}
        <Card className="border-amber-200/60 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Personalized Recommendations</h2>
              <p className="text-sm text-slate-500">Based on your current performance data.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <RecCard title="Boost Attendance" body="OS attendance at 78%, just above the 75% threshold. Mark consistently to secure eligibility." badge="warning" />
            <RecCard title="Prioritize OS Assignment" body="The overdue OS case study is your biggest risk. Submit it, even late, to improve completion rate." badge="danger" />
            <RecCard title="Leverage Strengths" body="Database Systems is your strongest at 94%. Use this confidence to tackle underperforming areas." badge="success" />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function AnalyticsStat({ label, value, badge, badgeLabel, gradient, icon: Icon }: { label: string; value: string; badge: "success" | "warning" | "danger" | "info"; badgeLabel: string; gradient: string; icon: typeof Gauge }) {
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
    </div>
  );
}

function RecCard({ title, body, badge }: { title: string; body: string; badge: "success" | "warning" | "danger" }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
      <Badge type={badge}>{badge === "danger" ? "Urgent" : badge === "warning" ? "Attention" : "Great job"}</Badge>
      <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
