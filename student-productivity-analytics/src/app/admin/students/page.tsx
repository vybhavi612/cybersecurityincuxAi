"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpDown,
  ChevronRight,
  Download,
  Mail,
  Plus,
  Search,
  Shield,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge, Card } from "@/components/ui/Card";
import { AdminStudent, STUDENTS } from "@/lib/adminPortalData";
import { apiFetch, AdminStudentRecord } from "@/lib/apiClient";

type SortKey = "name" | "attendancePercent" | "productivityScore" | "assignmentCompletion" | "currentStreak";
type FilterRisk = "all" | "low" | "medium" | "high";
type FilterStatus = "all" | "active" | "inactive";

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("productivityScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterRisk, setFilterRisk] = useState<FilterRisk>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [students, setStudents] = useState<AdminStudent[]>(STUDENTS);

  const loadStudents = useCallback(async () => {
    const data = await apiFetch<AdminStudentRecord[]>("/api/admin/students");
    if (!data?.length) return;
    const mapped: AdminStudent[] = data.map((s, idx) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      initials: s.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase(),
      semester: "Sem 4",
      branch: "CS",
      attendancePercent: s.attendancePercent,
      productivityScore: s.productivityScore,
      currentStreak: s.currentStreak,
      assignmentCompletion: Math.round(s.attendancePercent * 0.9),
      riskLevel: s.riskLevel,
      status: s.status,
      lastActive: s.lastActive ?? s.createdAt,
      joinedDate: s.createdAt,
      totalActivities: s.totalActivities,
      avatarColor: STUDENTS[idx % STUDENTS.length]?.avatarColor ?? "from-indigo-400 to-violet-500",
    }));
    setStudents(mapped);
  }, []);

  useEffect(() => {
    loadStudents();
    const timer = setInterval(loadStudents, 30_000);
    return () => clearInterval(timer);
  }, [loadStudents]);

  const filtered = useMemo(() => {
    let result = [...students];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q));
    }
    if (filterRisk !== "all") result = result.filter((s) => s.riskLevel === filterRisk);
    if (filterStatus !== "all") result = result.filter((s) => s.status === filterStatus);
    result.sort((a, b) => {
      const av = a[sortKey as keyof AdminStudent] as number | string;
      const bv = b[sortKey as keyof AdminStudent] as number | string;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "desc" ? bv - av : av - bv;
      return sortDir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
    return result;
  }, [search, sortKey, sortDir, filterRisk, filterStatus]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const riskBadge = (risk: AdminStudent["riskLevel"]) => {
    const map = { low: "success", medium: "warning", high: "danger" } as const;
    return <Badge type={map[risk]}>{risk.charAt(0).toUpperCase() + risk.slice(1)}</Badge>;
  };

  return (
    <DashboardLayout role="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Management</p>
            <h2 className="text-xl font-bold text-slate-900">Student Directory</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const csv = [
                  "Name,Email,Branch,Semester,Attendance%,Score,Streak,Assignments%,Risk",
                  ...STUDENTS.map((s) =>
                    `"${s.name}","${s.email}","${s.branch}","${s.semester}",${s.attendancePercent},${s.productivityScore},${s.currentStreak},${s.assignmentCompletion},${s.riskLevel}`
                  ),
                ].join("\n");
                const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                const a = document.createElement("a");
                a.href = url; a.download = "students.csv"; a.click();
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Add Student
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat label="Total" value={STUDENTS.length} color="text-indigo-600" bg="bg-indigo-50" />
          <MiniStat label="Active" value={STUDENTS.filter((s) => s.status === "active").length} color="text-emerald-600" bg="bg-emerald-50" />
          <MiniStat label="Medium Risk" value={STUDENTS.filter((s) => s.riskLevel === "medium").length} color="text-amber-600" bg="bg-amber-50" />
          <MiniStat label="High Risk" value={STUDENTS.filter((s) => s.riskLevel === "high").length} color="text-rose-600" bg="bg-rose-50" />
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, branch…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "low", "medium", "high"] as FilterRisk[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFilterRisk(r)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    filterRisk === r
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {r === "all" ? "All Risk" : r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(["all", "active", "inactive"] as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    filterStatus === s
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s === "all" ? "All Status" : s}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{filtered.length} students shown</p>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-5 py-3.5 text-left">
                    <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                      Student <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-left">
                    <button type="button" onClick={() => toggleSort("attendancePercent")} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                      Attendance <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-left">
                    <button type="button" onClick={() => toggleSort("productivityScore")} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                      Score <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-left">
                    <button type="button" onClick={() => toggleSort("assignmentCompletion")} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                      Assignments <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-left">
                    <button type="button" onClick={() => toggleSort("currentStreak")} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                      Streak <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Risk</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${student.avatarColor} text-xs font-bold text-white`}>
                          {student.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                          <p className="text-xs text-slate-400">{student.branch} · {student.semester}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className={`font-semibold ${student.attendancePercent < 75 ? "text-rose-600" : student.attendancePercent >= 90 ? "text-emerald-600" : "text-slate-900"}`}>
                          {student.attendancePercent}%
                        </p>
                        <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full rounded-full ${student.attendancePercent < 75 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${student.attendancePercent}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className={`font-semibold ${student.productivityScore < 50 ? "text-rose-600" : student.productivityScore >= 80 ? "text-indigo-600" : "text-slate-900"}`}>
                        {student.productivityScore}/100
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900">{student.assignmentCompletion}%</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900">{student.currentStreak}d</p>
                    </td>
                    <td className="px-4 py-3.5">{riskBadge(student.riskLevel)}</td>
                    <td className="px-4 py-3.5">
                      <Badge type={student.status === "active" ? "success" : "info"}>{student.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(student)}
                        className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 ml-auto"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-400">No students match the current filters.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Student profile drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
            {/* Drawer header */}
            <div className={`bg-gradient-to-br ${selectedStudent.avatarColor} p-6 text-white`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold">
                    {selectedStudent.initials}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                    <p className="text-sm text-white/80">{selectedStudent.email}</p>
                    <p className="mt-1 text-xs text-white/60">{selectedStudent.branch} · {selectedStudent.semester}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 p-5">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                {riskBadge(selectedStudent.riskLevel)}
                <Badge type={selectedStudent.status === "active" ? "success" : "info"}>{selectedStudent.status}</Badge>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  Joined {new Date(selectedStudent.joinedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>

              {/* Core metrics */}
              <div className="grid grid-cols-2 gap-3">
                <MetricBox label="Attendance" value={`${selectedStudent.attendancePercent}%`} color={selectedStudent.attendancePercent < 75 ? "text-rose-600" : "text-emerald-600"} />
                <MetricBox label="Productivity" value={`${selectedStudent.productivityScore}/100`} color="text-indigo-600" />
                <MetricBox label="Streak" value={`${selectedStudent.currentStreak} days`} color="text-amber-600" />
                <MetricBox label="Assignments" value={`${selectedStudent.assignmentCompletion}%`} color="text-blue-600" />
              </div>

              {/* Performance bars */}
              <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Performance Breakdown</h3>
                <ProfileBar label="Attendance" value={selectedStudent.attendancePercent} threshold={75} />
                <ProfileBar label="Productivity" value={selectedStudent.productivityScore} threshold={50} />
                <ProfileBar label="Assignment Completion" value={selectedStudent.assignmentCompletion} threshold={60} />
              </div>

              {/* Activity summary */}
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Quick Summary</h3>
                <div className="space-y-2">
                  <SummaryRow icon={<Activity className="h-4 w-4 text-indigo-400" />} label="Total Activities" value={String(selectedStudent.totalActivities)} />
                  <SummaryRow icon={<Shield className="h-4 w-4 text-emerald-400" />} label="Risk Level" value={selectedStudent.riskLevel.charAt(0).toUpperCase() + selectedStudent.riskLevel.slice(1)} />
                  <SummaryRow icon={<Mail className="h-4 w-4 text-slate-400" />} label="Last Active" value={new Date(selectedStudent.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
                </div>
              </div>

              {/* Recommendations */}
              {selectedStudent.riskLevel !== "low" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-sm font-bold text-amber-900">Recommended Actions</h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-amber-800">
                    {selectedStudent.attendancePercent < 75 && (
                      <li>• Schedule a check-in — attendance is below the 75% threshold.</li>
                    )}
                    {selectedStudent.assignmentCompletion < 60 && (
                      <li>• Review overdue assignments and set a catch-up plan.</li>
                    )}
                    {selectedStudent.productivityScore < 50 && (
                      <li>• Refer student for academic support or mentoring session.</li>
                    )}
                    {selectedStudent.currentStreak === 0 && (
                      <li>• Student has no active streak — encourage daily engagement.</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Mail className="h-4 w-4" /> Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add student modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add New Student</h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setShowAddForm(false);
                alert("Student added! (Demo mode — connects to /api/students in production)");
              }}
            >
              {["Name", "Email", "Password"].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-slate-700">{field}</label>
                  <input
                    type={field === "Password" ? "password" : field === "Email" ? "email" : "text"}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              ))}
              <button type="submit" className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                Add Student
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function MiniStat({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl ${bg} p-4`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function ProfileBar({ label, value, threshold }: { label: string; value: number; threshold: number }) {
  const isGood = value >= threshold;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className={`font-bold ${isGood ? "text-emerald-600" : "text-rose-600"}`}>{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${isGood ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {icon} {label}
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
