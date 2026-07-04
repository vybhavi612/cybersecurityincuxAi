export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "UNMARKED" | "UPCOMING";

export type Priority = "High" | "Medium" | "Low";

export type AssignmentStatus = "Pending" | "Submitted" | "Overdue";

export interface AttendanceRecord {
  date: string;
  day: string;
  status: AttendanceStatus;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: AssignmentStatus;
  priority: Priority;
  submittedAt?: string;
}

export const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const dayName = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
  });

const shortMonth = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export const assignments: Assignment[] = [
  {
    id: "a1",
    title: "Data Structures Lab Report",
    description: "Submit the analysis notes, code screenshots, and complexity summary.",
    dueDate: formatDateKey(addDays(new Date(), 1)),
    status: "Pending",
    priority: "High",
  },
  {
    id: "a2",
    title: "Machine Learning Quiz",
    description: "Complete the supervised learning practice quiz before class.",
    dueDate: formatDateKey(addDays(new Date(), 3)),
    status: "Pending",
    priority: "Medium",
  },
  {
    id: "a3",
    title: "Operating Systems Case Study",
    description: "Compare scheduling algorithms and attach your observation table.",
    dueDate: formatDateKey(addDays(new Date(), -2)),
    status: "Overdue",
    priority: "High",
  },
  {
    id: "a4",
    title: "Database Normalization Worksheet",
    description: "Normalize the library schema through 3NF and list assumptions.",
    dueDate: formatDateKey(addDays(new Date(), -1)),
    status: "Submitted",
    priority: "Low",
    submittedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "a5",
    title: "Professional Communication Draft",
    description: "Upload the revised memo and peer review checklist.",
    dueDate: formatDateKey(addDays(new Date(), 6)),
    status: "Pending",
    priority: "Low",
  },
];

export const getCurrentWeekAttendance = (): AttendanceRecord[] => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(today, mondayOffset);
  const pattern: AttendanceStatus[] = ["PRESENT", "PRESENT", "UNMARKED", "UPCOMING", "UPCOMING", "UPCOMING", "UPCOMING"];

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const key = formatDateKey(date);
    const isPast = date < new Date(formatDateKey(today));
    const isToday = key === formatDateKey(today);

    let status = pattern[index];
    if (isPast && index === 2) status = "LATE";
    if (isToday) status = "UNMARKED";
    if (!isPast && !isToday) status = "UPCOMING";

    return {
      date: key,
      day: dayName(date),
      status,
    };
  });
};

export const attendanceHistory = [
  { label: "Week 1", present: 4, total: 5 },
  { label: "Week 2", present: 5, total: 5 },
  { label: "Week 3", present: 3, total: 5 },
  { label: "Week 4", present: 5, total: 5 },
  { label: "Week 5", present: 4, total: 5 },
  { label: "Week 6", present: 4, total: 5 },
];

export const attendanceTrend = attendanceHistory.map((item) => ({
  name: item.label,
  percentage: Math.round((item.present / item.total) * 100),
}));

export const monthlyAttendance = Array.from({ length: 30 }, (_, index) => {
  const date = addDays(new Date(), index - 29);
  const score = index % 9 === 0 ? 0 : index % 7 === 0 ? 0.5 : 1;
  return {
    date: shortMonth(date),
    value: score,
  };
});

export const getAssignmentStats = (items: Assignment[]) => {
  const completed = items.filter((item) => item.status === "Submitted").length;
  const pending = items.filter((item) => item.status === "Pending").length;
  const overdue = items.filter((item) => item.status === "Overdue").length;
  const completionPercentage = Math.round((completed / items.length) * 100);

  return {
    total: items.length,
    completed,
    pending,
    overdue,
    completionPercentage,
  };
};

export const getRemainingTime = (dueDate: string, status: AssignmentStatus) => {
  if (status === "Submitted") return "Submitted";

  const now = new Date();
  const due = new Date(`${dueDate}T23:59:59`);
  const diff = due.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
};

export const calculateAttendancePercentage = (records: AttendanceRecord[]) => {
  const counted = records.filter((record) => record.status !== "UPCOMING" && record.status !== "UNMARKED");
  if (counted.length === 0) return 0;

  const present = counted.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
  return Math.round((present / counted.length) * 100);
};

export const calculateProductivityScore = ({
  attendancePercentage,
  assignmentCompletionRate,
  currentStreak,
  timelinessRate,
}: {
  attendancePercentage: number;
  assignmentCompletionRate: number;
  currentStreak: number;
  timelinessRate: number;
}) => {
  const attendanceScore = attendancePercentage * 0.45;
  const assignmentScore = assignmentCompletionRate * 0.25;
  const consistencyScore = Math.min(currentStreak / 10, 1) * 20;
  const timelinessScore = timelinessRate * 0.1;

  return Math.round(attendanceScore + assignmentScore + consistencyScore + timelinessScore);
};

export const getProductivityCategory = (score: number) => {
  if (score >= 85) return { label: "Excellent", tone: "success" as const };
  if (score >= 70) return { label: "Good", tone: "info" as const };
  if (score >= 50) return { label: "Average", tone: "warning" as const };
  return { label: "Needs Improvement", tone: "danger" as const };
};
