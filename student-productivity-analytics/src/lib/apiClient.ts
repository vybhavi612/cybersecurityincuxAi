// Authenticated API client with automatic token injection and graceful error handling

export function getToken(): string {
  return typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
}

export function getCurrentUser(): { id: string; name: string; email: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const token = getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── Typed API response shapes ──────────────────────────────────────────────

export interface StudentAnalytics {
  attendancePercentage: number;
  productivityScore: number;
  currentStreak: number;
  longestStreak: number;
  totalActivities: number;
  achievements: { id: string; title: string; description?: string; badge: string; earnedAt: string }[];
  recentActivities: { id: string; activityType: string; points: number; createdAt: string }[];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  loginTime?: string;
  logoutTime?: string;
  duration?: number;
}

export interface AdminAnalytics {
  totalStudents: number;
  presentToday: number;
  averageAttendance: number;
  averageProductivity: number;
  topPerformer: { id: string; name: string; email: string; score: number } | null;
  atRiskStudents: number;
}

export interface AdminStudentRecord {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  attendancePercent: number;
  productivityScore: number;
  currentStreak: number;
  totalActivities: number;
  riskLevel: "low" | "medium" | "high";
  status: "active" | "inactive";
  lastActive: string | null;
}

export interface AdminAttendanceOverview {
  daily: { date: string; label: string; present: number; absent: number; late: number; total: number }[];
  weekly: { week: string; present: number; late: number; absent: number }[];
  totalStudents: number;
}

// ── Attendance data transformers (raw DB → UI format) ─────────────────────

export function buildWeekAttendance(
  records: AttendanceRecord[]
): { date: string; day: string; status: "PRESENT" | "ABSENT" | "LATE" | "UNMARKED" | "UPCOMING" }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    const record = records.find((r) => r.date.slice(0, 10) === dateStr);

    let status: "PRESENT" | "ABSENT" | "LATE" | "UNMARKED" | "UPCOMING";
    if (record) {
      status = record.status === "EXCUSED" ? "ABSENT" : record.status;
    } else if (dateStr > todayStr) {
      status = "UPCOMING";
    } else if (dateStr === todayStr) {
      status = "UNMARKED";
    } else {
      status = "ABSENT";
    }

    return {
      date: dateStr,
      day: date.toLocaleDateString("en-US", { weekday: "long" }),
      status,
    };
  });
}

export function buildMonthlyHeatmap(records: AttendanceRecord[]): { date: string; value: number }[] {
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().slice(0, 10);
    const record = records.find((r) => r.date.slice(0, 10) === dateStr);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: record
        ? record.status === "PRESENT"
          ? 1
          : record.status === "LATE"
            ? 0.5
            : 0
        : 0,
    };
  });
}

export function buildAttendanceTrend(
  records: AttendanceRecord[]
): { name: string; percentage: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (5 - i) * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);

    const weekRecords = records.filter((r) => {
      const d = new Date(r.date);
      return d >= weekStart && d <= weekEnd;
    });
    const present = weekRecords.filter(
      (r) => r.status === "PRESENT" || r.status === "LATE"
    ).length;
    const total = weekRecords.length || 1;

    return { name: `Wk ${i + 1}`, percentage: Math.round((present / total) * 100) };
  });
}

export function buildAttendanceHistory(
  records: AttendanceRecord[]
): { label: string; present: number; total: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (5 - i) * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);

    const weekRecords = records.filter((r) => {
      const d = new Date(r.date);
      return d >= weekStart && d <= weekEnd;
    });
    const present = weekRecords.filter(
      (r) => r.status === "PRESENT" || r.status === "LATE"
    ).length;

    return { label: `Wk ${i + 1}`, present, total: weekRecords.length || 5 };
  });
}
