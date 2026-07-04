"use client";

import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Plus,
  TimerReset,
  Trash2,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge, Card, ProgressBar } from "@/components/ui/Card";
import { ADMIN_ASSIGNMENTS, STUDENTS, AdminAssignment } from "@/lib/adminPortalData";

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<AdminAssignment[]>(ADMIN_ASSIGNMENTS);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AdminAssignment | null>(null);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    description: "",
    dueDate: "",
    priority: "Medium" as AdminAssignment["priority"],
  });

  const totalSubmitted = assignments.reduce((s, a) => s + a.submitted, 0);
  const totalPending = assignments.reduce((s, a) => s + a.pending, 0);
  const totalOverdue = assignments.reduce((s, a) => s + a.overdue, 0);
  const overallRate = Math.round((totalSubmitted / (assignments.length * 20)) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingId ? { ...a, ...form } : a
        )
      );
      setEditingId(null);
    } else {
      const newAssignment: AdminAssignment = {
        id: `a${Date.now()}`,
        ...form,
        createdAt: new Date().toISOString().slice(0, 10),
        totalStudents: 20,
        submitted: 0,
        pending: 20,
        overdue: 0,
      };
      setAssignments((prev) => [newAssignment, ...prev]);
    }
    setForm({ title: "", subject: "", description: "", dueDate: "", priority: "Medium" });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this assignment?")) {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      if (selectedAssignment?.id === id) setSelectedAssignment(null);
    }
  };

  const startEdit = (a: AdminAssignment) => {
    setForm({ title: a.title, subject: a.subject, description: a.description, dueDate: a.dueDate, priority: a.priority });
    setEditingId(a.id);
    setShowForm(true);
  };

  return (
    <DashboardLayout role="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Coursework</p>
            <h2 className="text-xl font-bold text-slate-900">Assignment Management</h2>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: "", subject: "", description: "", dueDate: "", priority: "Medium" }); }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Create Assignment
          </button>
        </div>

        {/* KPI cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AssignKPI label="Total Assignments" value={assignments.length} icon={ClipboardList} gradient="from-indigo-400 to-violet-500" />
          <AssignKPI label="Total Submitted" value={totalSubmitted} icon={CheckCircle2} gradient="from-emerald-400 to-green-500" />
          <AssignKPI label="Total Pending" value={totalPending} icon={TimerReset} gradient="from-amber-400 to-orange-500" />
          <AssignKPI label="Total Overdue" value={totalOverdue} icon={AlertCircle} gradient="from-rose-400 to-red-500" highlight={totalOverdue > 0} />
        </section>

        {/* Overall completion */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Class-wide Completion</h3>
              <p className="text-xs text-slate-500">Aggregate across all active assignments</p>
            </div>
            <Badge type={overallRate >= 70 ? "success" : overallRate >= 40 ? "warning" : "danger"}>
              {overallRate}% complete
            </Badge>
          </div>
          <div className="mt-4">
            <ProgressBar label="Completion rate" value={overallRate} color="blue" />
          </div>
        </Card>

        {/* Assignments list + detail */}
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* List */}
          <div className="space-y-4">
            {assignments.map((a) => {
              const completionRate = Math.round((a.submitted / a.totalStudents) * 100);
              const isSelected = selectedAssignment?.id === a.id;
              const isOverdue = new Date(a.dueDate) < new Date();
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAssignment(isSelected ? null : a)}
                  className={`cursor-pointer rounded-2xl border p-5 transition hover:shadow-md ${
                    isSelected ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200/80 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                          <BookOpen className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{a.title}</h3>
                          <p className="text-xs text-slate-400">{a.subject}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge type={a.priority === "High" ? "danger" : a.priority === "Medium" ? "warning" : "info"}>{a.priority}</Badge>
                      {isOverdue && <Badge type="danger">Overdue</Badge>}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); startEdit(a); }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-slate-500 line-clamp-1">{a.description}</p>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                      <span>Submissions</span>
                      <span className="font-semibold text-slate-900">{a.submitted}/{a.totalStudents}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" />{a.submitted} submitted</span>
                    <span className="flex items-center gap-1 text-amber-600 font-medium"><TimerReset className="h-3.5 w-3.5" />{a.pending} pending</span>
                    {a.overdue > 0 && <span className="flex items-center gap-1 text-rose-600 font-medium"><AlertCircle className="h-3.5 w-3.5" />{a.overdue} overdue</span>}
                    <span className="ml-auto">Due {new Date(a.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail / Submission status */}
          {selectedAssignment ? (
            <Card className="xl:sticky xl:top-24 xl:self-start">
              <div className="flex items-start justify-between">
                <div>
                  <Badge type={selectedAssignment.priority === "High" ? "danger" : selectedAssignment.priority === "Medium" ? "warning" : "info"}>
                    {selectedAssignment.priority} Priority
                  </Badge>
                  <h3 className="mt-2 text-base font-bold text-slate-900">{selectedAssignment.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selectedAssignment.subject}</p>
                </div>
                <button type="button" onClick={() => setSelectedAssignment(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-sm text-slate-600">{selectedAssignment.description}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-emerald-50 p-2">
                  <p className="text-lg font-bold text-emerald-700">{selectedAssignment.submitted}</p>
                  <p className="text-emerald-600">Submitted</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2">
                  <p className="text-lg font-bold text-amber-700">{selectedAssignment.pending}</p>
                  <p className="text-amber-600">Pending</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-2">
                  <p className="text-lg font-bold text-rose-700">{selectedAssignment.overdue}</p>
                  <p className="text-rose-600">Overdue</p>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Student Status</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {STUDENTS.map((s, idx) => {
                    const statusType = idx < selectedAssignment.submitted ? "submitted" : idx < selectedAssignment.submitted + selectedAssignment.pending ? "pending" : "overdue";
                    return (
                      <div key={s.id} className="flex items-center gap-2.5">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${s.avatarColor} text-xs font-bold text-white`}>{s.initials}</div>
                        <span className="flex-1 truncate text-sm text-slate-700">{s.name}</span>
                        <Badge type={statusType === "submitted" ? "success" : statusType === "pending" ? "warning" : "danger"}>
                          {statusType}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ) : (
            <div className="hidden xl:flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div>
                <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-400">Click an assignment to view submission details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingId(null); }} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? "Edit Assignment" : "Create Assignment"}</h3>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Title" type="text" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
              <FormField label="Subject" type="text" value={form.subject} onChange={(v) => setForm((f) => ({ ...f, subject: v }))} required />
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>
              <FormField label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))} required />
              <div>
                <label className="block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as AdminAssignment["priority"] }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  {["High", "Medium", "Low"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                {editingId ? "Update Assignment" : "Create Assignment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function AssignKPI({ label, value, icon: Icon, gradient, highlight = false }: { label: string; value: number; icon: typeof ClipboardList; gradient: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${highlight ? "border-rose-200/60 bg-rose-50/40" : "border-slate-200/80 bg-white"}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

function FormField({ label, type, value, onChange, required }: { label: string; type: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}
