export type RiskLevel = "low" | "medium" | "high";
export type StudentStatus = "active" | "inactive";

export interface AdminStudent {
  id: string;
  name: string;
  email: string;
  initials: string;
  semester: string;
  branch: string;
  attendancePercent: number;
  productivityScore: number;
  currentStreak: number;
  assignmentCompletion: number;
  riskLevel: RiskLevel;
  status: StudentStatus;
  lastActive: string;
  joinedDate: string;
  totalActivities: number;
  avatarColor: string;
}

export interface AdminAssignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  createdAt: string;
  totalStudents: number;
  submitted: number;
  pending: number;
  overdue: number;
  priority: "High" | "Medium" | "Low";
}

export interface RecentActivity {
  id: string;
  studentName: string;
  studentId: string;
  action: string;
  type: "submit" | "attend" | "register" | "miss" | "login";
  time: string;
  details?: string;
}

export interface AttendanceDay {
  date: string;
  label: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export const STUDENTS: AdminStudent[] = [
  {
    id: "s1", name: "Priya Sharma", email: "priya.sharma@college.edu", initials: "PS",
    semester: "Sem 4", branch: "CS", attendancePercent: 94, productivityScore: 89,
    currentStreak: 12, assignmentCompletion: 92, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2024-08-01", totalActivities: 142, avatarColor: "from-violet-400 to-purple-500",
  },
  {
    id: "s2", name: "Rahul Verma", email: "rahul.verma@college.edu", initials: "RV",
    semester: "Sem 4", branch: "CS", attendancePercent: 88, productivityScore: 82,
    currentStreak: 8, assignmentCompletion: 85, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2024-08-01", totalActivities: 118, avatarColor: "from-blue-400 to-indigo-500",
  },
  {
    id: "s3", name: "Alex Kumar", email: "alex.kumar@college.edu", initials: "AK",
    semester: "Sem 4", branch: "CS", attendancePercent: 92, productivityScore: 87,
    currentStreak: 7, assignmentCompletion: 88, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2024-08-01", totalActivities: 134, avatarColor: "from-indigo-400 to-violet-500",
  },
  {
    id: "s4", name: "Neha Singh", email: "neha.singh@college.edu", initials: "NS",
    semester: "Sem 4", branch: "IT", attendancePercent: 76, productivityScore: 71,
    currentStreak: 4, assignmentCompletion: 74, riskLevel: "medium", status: "active",
    lastActive: "2026-06-03", joinedDate: "2024-08-01", totalActivities: 87, avatarColor: "from-pink-400 to-rose-500",
  },
  {
    id: "s5", name: "Aryan Patel", email: "aryan.patel@college.edu", initials: "AP",
    semester: "Sem 2", branch: "CS", attendancePercent: 85, productivityScore: 78,
    currentStreak: 6, assignmentCompletion: 80, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2025-01-15", totalActivities: 96, avatarColor: "from-emerald-400 to-green-500",
  },
  {
    id: "s6", name: "Kavya Reddy", email: "kavya.reddy@college.edu", initials: "KR",
    semester: "Sem 4", branch: "CS", attendancePercent: 90, productivityScore: 85,
    currentStreak: 9, assignmentCompletion: 87, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2024-08-01", totalActivities: 127, avatarColor: "from-teal-400 to-cyan-500",
  },
  {
    id: "s7", name: "Rohan Gupta", email: "rohan.gupta@college.edu", initials: "RG",
    semester: "Sem 6", branch: "ECE", attendancePercent: 68, productivityScore: 63,
    currentStreak: 3, assignmentCompletion: 66, riskLevel: "medium", status: "active",
    lastActive: "2026-06-03", joinedDate: "2023-08-01", totalActivities: 74, avatarColor: "from-amber-400 to-orange-500",
  },
  {
    id: "s8", name: "Ishaan Malhotra", email: "ishaan.malhotra@college.edu", initials: "IM",
    semester: "Sem 4", branch: "CS", attendancePercent: 58, productivityScore: 48,
    currentStreak: 1, assignmentCompletion: 52, riskLevel: "high", status: "active",
    lastActive: "2026-06-02", joinedDate: "2024-08-01", totalActivities: 42, avatarColor: "from-rose-400 to-red-500",
  },
  {
    id: "s9", name: "Shruti Joshi", email: "shruti.joshi@college.edu", initials: "SJ",
    semester: "Sem 4", branch: "CS", attendancePercent: 95, productivityScore: 92,
    currentStreak: 15, assignmentCompletion: 95, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2024-08-01", totalActivities: 156, avatarColor: "from-lime-400 to-green-500",
  },
  {
    id: "s10", name: "Dev Sharma", email: "dev.sharma@college.edu", initials: "DS",
    semester: "Sem 6", branch: "CS", attendancePercent: 72, productivityScore: 67,
    currentStreak: 5, assignmentCompletion: 69, riskLevel: "medium", status: "active",
    lastActive: "2026-06-03", joinedDate: "2023-08-01", totalActivities: 83, avatarColor: "from-sky-400 to-blue-500",
  },
  {
    id: "s11", name: "Ananya Nair", email: "ananya.nair@college.edu", initials: "AN",
    semester: "Sem 2", branch: "IT", attendancePercent: 88, productivityScore: 83,
    currentStreak: 7, assignmentCompletion: 84, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2025-01-15", totalActivities: 109, avatarColor: "from-fuchsia-400 to-pink-500",
  },
  {
    id: "s12", name: "Varun Mehta", email: "varun.mehta@college.edu", initials: "VM",
    semester: "Sem 4", branch: "ME", attendancePercent: 45, productivityScore: 38,
    currentStreak: 0, assignmentCompletion: 42, riskLevel: "high", status: "inactive",
    lastActive: "2026-05-28", joinedDate: "2024-08-01", totalActivities: 21, avatarColor: "from-slate-400 to-gray-500",
  },
  {
    id: "s13", name: "Pooja Iyer", email: "pooja.iyer@college.edu", initials: "PI",
    semester: "Sem 4", branch: "CS", attendancePercent: 82, productivityScore: 76,
    currentStreak: 6, assignmentCompletion: 78, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2024-08-01", totalActivities: 102, avatarColor: "from-orange-400 to-amber-500",
  },
  {
    id: "s14", name: "Sahil Khan", email: "sahil.khan@college.edu", initials: "SK",
    semester: "Sem 6", branch: "ECE", attendancePercent: 65, productivityScore: 58,
    currentStreak: 2, assignmentCompletion: 61, riskLevel: "medium", status: "active",
    lastActive: "2026-06-02", joinedDate: "2023-08-01", totalActivities: 61, avatarColor: "from-cyan-400 to-teal-500",
  },
  {
    id: "s15", name: "Tanvi Choudhary", email: "tanvi.c@college.edu", initials: "TC",
    semester: "Sem 4", branch: "CS", attendancePercent: 91, productivityScore: 88,
    currentStreak: 10, assignmentCompletion: 90, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2024-08-01", totalActivities: 139, avatarColor: "from-indigo-400 to-blue-500",
  },
  {
    id: "s16", name: "Kunal Jain", email: "kunal.jain@college.edu", initials: "KJ",
    semester: "Sem 2", branch: "CS", attendancePercent: 78, productivityScore: 73,
    currentStreak: 5, assignmentCompletion: 75, riskLevel: "medium", status: "active",
    lastActive: "2026-06-03", joinedDate: "2025-01-15", totalActivities: 88, avatarColor: "from-purple-400 to-violet-500",
  },
  {
    id: "s17", name: "Riya Agarwal", email: "riya.agarwal@college.edu", initials: "RA",
    semester: "Sem 4", branch: "IT", attendancePercent: 87, productivityScore: 81,
    currentStreak: 7, assignmentCompletion: 83, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2024-08-01", totalActivities: 115, avatarColor: "from-rose-400 to-pink-500",
  },
  {
    id: "s18", name: "Aditya Singh", email: "aditya.singh@college.edu", initials: "AS",
    semester: "Sem 4", branch: "ME", attendancePercent: 42, productivityScore: 35,
    currentStreak: 0, assignmentCompletion: 38, riskLevel: "high", status: "inactive",
    lastActive: "2026-05-25", joinedDate: "2024-08-01", totalActivities: 18, avatarColor: "from-red-400 to-rose-500",
  },
  {
    id: "s19", name: "Meera Pillai", email: "meera.pillai@college.edu", initials: "MP",
    semester: "Sem 4", branch: "CS", attendancePercent: 93, productivityScore: 91,
    currentStreak: 11, assignmentCompletion: 93, riskLevel: "low", status: "active",
    lastActive: "2026-06-04", joinedDate: "2024-08-01", totalActivities: 148, avatarColor: "from-emerald-400 to-teal-500",
  },
  {
    id: "s20", name: "Vicky Bhatt", email: "vicky.bhatt@college.edu", initials: "VB",
    semester: "Sem 6", branch: "CS", attendancePercent: 69, productivityScore: 61,
    currentStreak: 3, assignmentCompletion: 64, riskLevel: "medium", status: "active",
    lastActive: "2026-06-03", joinedDate: "2023-08-01", totalActivities: 72, avatarColor: "from-amber-400 to-yellow-500",
  },
];

export const ADMIN_ASSIGNMENTS: AdminAssignment[] = [
  {
    id: "a1", title: "Data Structures Lab Report", subject: "Data Structures",
    description: "Submit lab analysis, code screenshots, and complexity summary.",
    dueDate: "2026-06-05", createdAt: "2026-05-25",
    totalStudents: 20, submitted: 14, pending: 4, overdue: 2, priority: "High",
  },
  {
    id: "a2", title: "Machine Learning Quiz", subject: "Machine Learning",
    description: "Complete the supervised learning practice quiz.",
    dueDate: "2026-06-07", createdAt: "2026-05-28",
    totalStudents: 20, submitted: 11, pending: 7, overdue: 2, priority: "Medium",
  },
  {
    id: "a3", title: "Operating Systems Case Study", subject: "Operating Systems",
    description: "Compare scheduling algorithms and attach observation table.",
    dueDate: "2026-06-02", createdAt: "2026-05-20",
    totalStudents: 20, submitted: 8, pending: 0, overdue: 12, priority: "High",
  },
  {
    id: "a4", title: "Database Normalization Worksheet", subject: "Database Systems",
    description: "Normalize the library schema through 3NF.",
    dueDate: "2026-06-03", createdAt: "2026-05-22",
    totalStudents: 20, submitted: 17, pending: 2, overdue: 1, priority: "Low",
  },
  {
    id: "a5", title: "Professional Communication Draft", subject: "Prof. Communication",
    description: "Upload revised memo and peer review checklist.",
    dueDate: "2026-06-10", createdAt: "2026-06-01",
    totalStudents: 20, submitted: 6, pending: 14, overdue: 0, priority: "Low",
  },
];

export const RECENT_ACTIVITIES: RecentActivity[] = [
  { id: "r1", studentName: "Shruti Joshi", studentId: "s9", action: "Submitted Lab Report", type: "submit", time: "2 min ago", details: "Data Structures Lab Report" },
  { id: "r2", studentName: "Priya Sharma", studentId: "s1", action: "Marked Attendance", type: "attend", time: "8 min ago" },
  { id: "r3", studentName: "Tanvi Choudhary", studentId: "s15", action: "Submitted Assignment", type: "submit", time: "15 min ago", details: "ML Quiz" },
  { id: "r4", studentName: "Ishaan Malhotra", studentId: "s8", action: "Missed Deadline", type: "miss", time: "1 hr ago", details: "OS Case Study" },
  { id: "r5", studentName: "Alex Kumar", studentId: "s3", action: "Logged In", type: "login", time: "1 hr ago" },
  { id: "r6", studentName: "Varun Mehta", studentId: "s12", action: "Missed Deadline", type: "miss", time: "2 hr ago", details: "DB Worksheet" },
  { id: "r7", studentName: "Meera Pillai", studentId: "s19", action: "Marked Attendance", type: "attend", time: "2 hr ago" },
  { id: "r8", studentName: "Kavya Reddy", studentId: "s6", action: "Submitted Assignment", type: "submit", time: "3 hr ago", details: "DB Normalization" },
  { id: "r9", studentName: "Aryan Patel", studentId: "s5", action: "Logged In", type: "login", time: "3 hr ago" },
  { id: "r10", studentName: "Riya Agarwal", studentId: "s17", action: "Submitted Assignment", type: "submit", time: "4 hr ago", details: "ML Quiz" },
];

// Weekly attendance (last 6 weeks)
export const WEEKLY_ATTENDANCE = [
  { week: "Wk 1", present: 16, late: 2, absent: 2 },
  { week: "Wk 2", present: 18, late: 1, absent: 1 },
  { week: "Wk 3", present: 14, late: 3, absent: 3 },
  { week: "Wk 4", present: 17, late: 2, absent: 1 },
  { week: "Wk 5", present: 15, late: 2, absent: 3 },
  { week: "Wk 6", present: 17, late: 1, absent: 2 },
];

// Productivity trend (6 weeks)
export const PRODUCTIVITY_TREND = [
  { week: "Wk 1", avg: 68 },
  { week: "Wk 2", avg: 72 },
  { week: "Wk 3", avg: 70 },
  { week: "Wk 4", avg: 75 },
  { week: "Wk 5", avg: 73 },
  { week: "Wk 6", avg: 76 },
];

// Assignment completion trend
export const ASSIGNMENT_TREND = [
  { week: "Wk 1", rate: 74 },
  { week: "Wk 2", rate: 78 },
  { week: "Wk 3", rate: 71 },
  { week: "Wk 4", rate: 82 },
  { week: "Wk 5", rate: 79 },
  { week: "Wk 6", rate: 80 },
];

// Daily attendance for last 30 days
export const DAILY_ATTENDANCE: AttendanceDay[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  if (isWeekend) return null;

  const present = 14 + Math.floor(Math.random() * 5);
  const late = Math.floor(Math.random() * 3);
  const absent = 20 - present - late;
  return {
    date: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    present,
    late,
    absent: Math.max(0, absent),
    total: 20,
  };
}).filter(Boolean) as AttendanceDay[];

// Derived admin stats
export function getAdminStats() {
  const total = STUDENTS.length;
  const active = STUDENTS.filter((s) => s.status === "active").length;
  const atRisk = STUDENTS.filter((s) => s.riskLevel === "high").length;
  const mediumRisk = STUDENTS.filter((s) => s.riskLevel === "medium").length;
  const avgAttendance = Math.round(STUDENTS.reduce((s, st) => s + st.attendancePercent, 0) / total);
  const avgProductivity = Math.round(STUDENTS.reduce((s, st) => s + st.productivityScore, 0) / total);
  const presentToday = STUDENTS.filter((s) => s.status === "active" && s.lastActive === "2026-06-04").length;

  const topPerformers = [...STUDENTS].sort((a, b) => b.productivityScore - a.productivityScore).slice(0, 5);
  const atRiskStudents = STUDENTS.filter((s) => s.riskLevel === "high");
  const medRiskStudents = STUDENTS.filter((s) => s.riskLevel === "medium");

  return {
    totalStudents: total,
    activeStudents: active,
    presentToday,
    avgAttendance,
    avgProductivity,
    atRiskCount: atRisk,
    mediumRiskCount: mediumRisk,
    activeAssignments: ADMIN_ASSIGNMENTS.length,
    topPerformers,
    atRiskStudents,
    medRiskStudents,
  };
}
