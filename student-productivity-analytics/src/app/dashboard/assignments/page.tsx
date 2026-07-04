"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FileUp,
  Flag,
  ListChecks,
  Send,
  TimerReset,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge, Card, ProgressBar } from "@/components/ui/Card";
import {
  Assignment,
  assignments as initialAssignments,
  getAssignmentStats,
  getRemainingTime,
} from "@/lib/studentPortalData";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [selectedId, setSelectedId] = useState(initialAssignments[0]?.id ?? "");
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const stats = useMemo(() => getAssignmentStats(assignments), [assignments]);
  const selectedAssignment = assignments.find((a) => a.id === selectedId) ?? assignments[0];

  const submitAssignment = (assignmentId: string) => {
    setAssignments((items) =>
      items.map((a) =>
        a.id === assignmentId ? { ...a, status: "Submitted", submittedAt: new Date().toISOString() } : a
      )
    );
  };

  return (
    <DashboardLayout role="STUDENT">
      <div className="space-y-6">
        {/* Metric cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AssignmentMetric label="Total" value={stats.total} detail="Active assignments" icon={ListChecks} gradient="from-indigo-400 to-blue-500" />
          <AssignmentMetric label="Completed" value={stats.completed} detail="Submitted on time" icon={CheckCircle2} gradient="from-emerald-400 to-green-500" />
          <AssignmentMetric label="Pending" value={stats.pending} detail="Awaiting submission" icon={TimerReset} gradient="from-amber-400 to-orange-500" />
          <AssignmentMetric label="Overdue" value={stats.overdue} detail="Needs attention" icon={Flag} gradient="from-rose-400 to-pink-500" />
        </section>

        {/* Progress bar card */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Overall Progress</h2>
              <p className="mt-0.5 text-sm text-slate-500">Completion across submitted, pending, and overdue tasks.</p>
            </div>
            <Badge type={stats.completionPercentage >= 70 ? "success" : stats.completionPercentage >= 40 ? "warning" : "danger"}>
              {stats.completionPercentage}% complete
            </Badge>
          </div>
          <div className="mt-4">
            <ProgressBar label="Completion percentage" value={stats.completionPercentage} color="blue" />
          </div>
          {stats.overdue > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200/60 bg-rose-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-sm text-rose-700">
                You have <strong>{stats.overdue} overdue assignment{stats.overdue > 1 ? "s" : ""}</strong>. Submit these as soon as possible to avoid grade penalties.
              </p>
            </div>
          )}
        </Card>

        {/* Assignment list + detail panel */}
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* List */}
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">All Assignments</h2>
              <CalendarClock className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 space-y-3">
              {assignments.map((assignment) => {
                const isSelected = selectedAssignment.id === assignment.id;
                return (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => setSelectedId(assignment.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-indigo-300 bg-indigo-50 shadow-sm"
                        : "border-slate-200/80 bg-white hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <PriorityDot priority={assignment.priority} />
                          <h3 className="truncate text-sm font-semibold text-slate-900">{assignment.title}</h3>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{assignment.description}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <StatusBadge status={assignment.status} />
                        <PriorityBadge priority={assignment.priority} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Due{" "}
                        {new Date(`${assignment.dueDate}T00:00:00`).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className={getRemainingTimeColor(assignment.status, assignment.dueDate)}>
                        {getRemainingTime(assignment.dueDate, assignment.status)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Detail panel */}
          <Card className="xl:sticky xl:top-24 xl:self-start">
            {selectedAssignment && (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedAssignment.status} />
                    <PriorityBadge priority={selectedAssignment.priority} />
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-slate-900">{selectedAssignment.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedAssignment.description}</p>
                </div>

                {/* Details grid */}
                <div className="space-y-2.5 rounded-xl bg-slate-50 p-4 text-sm">
                  <DetailRow
                    label="Due date"
                    value={new Date(`${selectedAssignment.dueDate}T00:00:00`).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  />
                  <DetailRow
                    label="Remaining"
                    value={getRemainingTime(selectedAssignment.dueDate, selectedAssignment.status)}
                  />
                  <DetailRow
                    label="Submitted"
                    value={
                      selectedAssignment.submittedAt
                        ? new Date(selectedAssignment.submittedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Not submitted yet"
                    }
                  />
                </div>

                {/* File upload */}
                <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50/60">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 mx-auto">
                    <FileUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="mt-3 block text-sm font-semibold text-slate-900">
                    {uploadedFiles[selectedAssignment.id] ?? "Upload assignment file"}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">PDF, DOCX, ZIP, or image</span>
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        setUploadedFiles((cur) => ({ ...cur, [selectedAssignment.id]: file.name }));
                    }}
                  />
                </label>

                {/* Submit button */}
                <button
                  type="button"
                  disabled={selectedAssignment.status === "Submitted"}
                  onClick={() => submitAssignment(selectedAssignment.id)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
                    selectedAssignment.status === "Submitted"
                      ? "cursor-not-allowed bg-emerald-100 text-emerald-700"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {selectedAssignment.status === "Submitted" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Submitted
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit Assignment
                    </>
                  )}
                </button>
              </div>
            )}
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}

function getRemainingTimeColor(status: Assignment["status"], dueDate: string): string {
  if (status === "Submitted") return "text-emerald-600 font-medium";
  if (status === "Overdue") return "text-rose-600 font-medium";
  const diff = new Date(`${dueDate}T23:59:59`).getTime() - Date.now();
  if (diff < 24 * 60 * 60 * 1000) return "text-amber-600 font-medium";
  return "text-slate-500";
}

function AssignmentMetric({
  label,
  value,
  detail,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof ListChecks;
  gradient: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function PriorityDot({ priority }: { priority: Assignment["priority"] }) {
  const colors = { High: "bg-rose-500", Medium: "bg-amber-500", Low: "bg-emerald-500" };
  return <span className={`h-2 w-2 shrink-0 rounded-full ${colors[priority]}`} />;
}

function StatusBadge({ status }: { status: Assignment["status"] }) {
  const type = status === "Submitted" ? "success" : status === "Overdue" ? "danger" : "warning";
  return <Badge type={type}>{status}</Badge>;
}

function PriorityBadge({ priority }: { priority: Assignment["priority"] }) {
  const type = priority === "High" ? "danger" : priority === "Medium" ? "warning" : "info";
  return <Badge type={type}>{priority}</Badge>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
