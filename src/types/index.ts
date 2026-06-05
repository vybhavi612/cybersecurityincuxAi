export enum Role {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  token: string;
  user: User;
}

export interface DecodedToken {
  id: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: Date;
  loginTime?: Date | null;
  logoutTime?: Date | null;
  duration?: number | null;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
}

export interface Activity {
  id: string;
  studentId: string;
  activityType: string;
  description?: string | null;
  points: number;
  createdAt: Date;
}

export interface Achievement {
  id: string;
  studentId: string;
  title: string;
  description?: string | null;
  badge: string;
  earnedAt: Date;
}

export interface Report {
  id: string;
  studentId: string;
  month: Date;
  productivityScore: number;
  attendancePercent: number;
  taskCompletionRate: number;
  streakDays: number;
  totalActivities: number;
  achievementsCount: number;
  summary?: string;
  recommendations?: string;
}

export interface StudentStats {
  attendancePercentage: number;
  productivityScore: number;
  currentStreak: number;
  longestStreak: number;
  totalActivities: number;
  achievements: Achievement[];
  recentActivities: Activity[];
}

export interface AdminStats {
  totalStudents: number;
  presentToday: number;
  averageAttendance: number;
  averageProductivity: number;
  topPerformer?: User;
  atRiskStudents: number;
  totalActivities: number;
}
