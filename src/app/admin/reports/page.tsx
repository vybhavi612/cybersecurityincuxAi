"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Download,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge, Card } from "@/components/ui/Card";
import { STUDENTS, getAdminStats, PRODUCTIVITY_TREND } from "@/lib/adminPortalData";

const stats = getAdminStats();

const rankedStudents = [...STUDENTS].sort((a, b) => b.productivityScore - a.productivityScore);

const distributionData = [
  { name: "Excellent (80-100)", value: STUDENTS.filter((s) => s.productivityScore >= 80).length, fill: "#6366f1" },
  { name: "Good (60-79)", value: STUDENTS.filter((s) => s.productivityScore >= 60 && s.productivityScore < 80).length, fill: "#10b981" },
  { name: "Average (40-59)", value: STUDENTS.filter((s) => s.productivityScore >= 40 && s.productivityScore < 60).length, fill: "#f59e0b" },
  { name: "At-Risk (<40)", value: STUDENTS.filter((s) => s.productivityScore < 40).length, fill: "#f43f5e" },
];

const branchStats = [
  { branch: "CS", avgScore: 79, avgAttendance: 85, count: 12 },
  { branch: "IT", avgScore: 77, avgAttendance: 82, count: 3 },
  { branch: "ECE", avgScore: 61, avgAttendance: 70, count: 3 },
  { branch: "ME", avgScore: 37, avgAttendance: 44, count: 2 },
];

export default function ReportsPage() {
  const [aiSummary, setAiSummary] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState("");
  const [recommendations, setRecommendations] = useState<{ title: string; description: string }[]>([]);

  const generateAIReport = async () => {
    setLoadingAI(true);
    setAiError("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
      const [summaryRes, recRes] = await Promise.all([
        fetch("/api/admin/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type: "summary",
            context: {
              totalStudents: stats.totalStudents,
              presentToday: stats.presentToday,
              avgAttendance: stats.avgAttendance,
              avgProductivity: stats.avgProductivity,
              atRiskCount: stats.atRiskCount,
              assignmentsActive: stats.activeAssignments,
            },
          }),
        }),
        fetch("/api/admin/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            type: "recommendations",
            context: {
              totalStudents: stats.totalStudents,
              presentToday: stats.presentToday,
              avgAttendance: stats.avgAttendance,
              avgProductivity: stats.avgProductivity,
              atRiskCount: stats.atRiskCount,
              assignmentsActive: stats.activeAssignments,
            },
          }),
        }),
      ]);
      const summaryData = await summaryRes.json();
      const recData = await recRes.json();
      setAiSummary(summaryData.data ?? "");
      if (Array.isArray(recData.data)) setRecommendations(recData.data);
    } catch {
      setAiError("Could not generate AI report.");
    } finally {
      setLoadingAI(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      "Rank,Name,Email,Branch,Semester,Attendance%,Score,Streak,Assignments%,Risk",
      ...rankedStudents.map((s, i) =>
        `${i + 1},"${s.name}","${s.email}","${s.branch}","${s.semester}",${s.attendancePercent},${s.productivityScore},${s.currentStreak},${s.assignmentCompletion},${s.riskLevel}`
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `performance-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <DashboardLayout role="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Analytics</p>
            <h2 className="text-xl font-bold text-slate-900">Reports & Analytics</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={generateAIReport}
              disabled={loadingAI}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              <Sparkles className={`h-4 w-4 ${loadingAI ? "animate-pulse" : ""}`} />
              {loadingAI ? "Generating…" : "AI Report"}
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryKPI label="Class Average Score" value={`${stats.avgProductivity}/100`} sub="Productivity index" trend="up" />
          <SummaryKPI label="Avg Attendance" value={`${stats.avgAttendance}%`} sub="Last 30 days" trend={stats.avgAttendance >= 80 ? "up" : "down"} />
          <SummaryKPI label="At-Risk Students" value={String(stats.atRiskCount)} sub={`${Math.round((stats.atRiskCount / stats.totalStudents) * 100)}% of class`} trend="down" highlight />
          <SummaryKPI label="Top Score" value={`${rankedStudents[0]?.productivityScore ?? 0}/100`} sub={rankedStudents[0]?.name ?? ""} trend="up" />
        </section>

        {/* Charts */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Productivity trend */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Trend</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">Class Productivity Over Time</h3>
              </div>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-5 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PRODUCTIVITY_TREND} margin={{ left: -24, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[60, 85]} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]} name="Avg Score">
                    {PRODUCTIVITY_TREND.map((_, i) => (
                      <Cell key={i} fill={i === PRODUCTIVITY_TREND.length - 1 ? "#6366f1" : "#c7d2fe"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Score distribution pie */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Distribution</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">Performance Distribution</h3>
              </div>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ value }) => `${value}`}>
                    {distributionData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Branch performance */}
        <Card>
          <h3 className="text-sm font-bold text-slate-900 mb-5">Performance by Branch</h3>
          <div className="space-y-4">
            {branchStats.map((b) => (
              <div key={b.branch} className="grid grid-cols-[3rem_1fr_5rem_5rem] items-center gap-4">
                <span className="text-center rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{b.branch}</span>
                <div className="space-y-1.5">
                  <div>
                    <div className="mb-0.5 flex items-center justify-between text-xs text-slate-500">
                      <span>Productivity</span><span className="font-bold text-slate-900">{b.avgScore}/100</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${b.avgScore}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-0.5 flex items-center justify-between text-xs text-slate-500">
                      <span>Attendance</span><span className="font-bold text-slate-900">{b.avgAttendance}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${b.avgAttendance < 75 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${b.avgAttendance}%` }} />
                    </div>
                  </div>
                </div>
                <span className="text-center text-sm text-slate-500">{b.count} students</span>
                <Badge type={b.avgScore >= 70 ? "success" : b.avgScore >= 50 ? "warning" : "danger"}>
                  {b.avgScore >= 70 ? "Good" : b.avgScore >= 50 ? "Average" : "At Risk"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Productivity rankings */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-900">Productivity Rankings</h3>
            <span className="text-xs text-slate-400">{rankedStudents.length} students</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {["Rank", "Student", "Score", "Attendance", "Assignments", "Streak", "Risk"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankedStudents.map((s, i) => (
                  <tr key={s.id} className={`hover:bg-slate-50/50 ${i < 3 ? "bg-indigo-50/20" : ""}`}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${s.avatarColor} text-xs font-bold text-white`}>{s.initials}</div>
                        <div>
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.branch}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${s.productivityScore >= 80 ? "text-indigo-600" : s.productivityScore < 50 ? "text-rose-600" : "text-slate-900"}`}>
                        {s.productivityScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.attendancePercent}%</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.assignmentCompletion}%</td>
                    <td className="px-4 py-3 text-slate-700">{s.currentStreak}d</td>
                    <td className="px-4 py-3">
                      <Badge type={s.riskLevel === "low" ? "success" : s.riskLevel === "medium" ? "warning" : "danger"}>{s.riskLevel}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* At-Risk Detection */}
        <Card className="border-rose-200/60">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-red-500 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">At-Risk Detection</h3>
              <p className="text-xs text-slate-500">Automatically flagged by attendance, score, and inactivity thresholds</p>
            </div>
          </div>
          <div className="space-y-3">
            {stats.atRiskStudents.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200/60 bg-rose-50 px-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-200 text-sm font-bold text-rose-700">{s.initials}</div>
                  <div>
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.attendancePercent < 75 && <Badge type="danger">Low Attendance ({s.attendancePercent}%)</Badge>}
                  {s.productivityScore < 50 && <Badge type="danger">Low Score ({s.productivityScore})</Badge>}
                  {s.currentStreak === 0 && <Badge type="warning">No Streak</Badge>}
                  {s.status === "inactive" && <Badge type="info">Inactive</Badge>}
                </div>
              </div>
            ))}
            {stats.medRiskStudents.slice(0, 3).map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-700">{s.initials}</div>
                  <div>
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.branch} · {s.semester}</p>
                  </div>
                </div>
                <Badge type="warning">Medium Risk ({s.productivityScore} score)</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Report Panel */}
        {(aiSummary || recommendations.length > 0 || aiError) && (
          <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-violet-50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gemini AI Report</h3>
                <p className="text-xs text-slate-400">Generated by Google Gemini</p>
              </div>
            </div>
            {aiError && <p className="text-sm text-rose-600">{aiError}</p>}
            {aiSummary && (
              <div className="rounded-xl bg-white border border-indigo-100 p-4 text-sm leading-relaxed text-slate-700 mb-4">
                {aiSummary}
              </div>
            )}
            {recommendations.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">Strategic Recommendations</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="rounded-xl bg-white border border-indigo-100 p-4">
                      <p className="text-sm font-bold text-slate-900">{rec.title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function SummaryKPI({ label, value, sub, trend, highlight = false }: { label: string; value: string; sub: string; trend: "up" | "down"; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${highlight ? "border-rose-200/60 bg-rose-50/40" : "border-slate-200/80 bg-white"}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
        {trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      </div>
      <p className={`mt-3 text-2xl font-bold ${highlight ? "text-rose-700" : "text-slate-900"}`}>{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}
