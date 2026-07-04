import { Attendance, Activity, Achievement } from "@/types";

export function calculateAttendancePercentage(
  attendanceRecords: Attendance[],
  daysToCheck: number = 30
): number {
  if (!attendanceRecords.length) return 0;

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysToCheck * 24 * 60 * 60 * 1000);

  const recentAttendance = attendanceRecords.filter((a) => new Date(a.date) >= cutoffDate);
  const presentCount = recentAttendance.filter((a) => a.status === "PRESENT").length;

  if (recentAttendance.length === 0) return 0;
  return Math.round((presentCount / recentAttendance.length) * 100);
}

export function calculateProductivityScore(
  attendance: Attendance[],
  activities: Activity[],
  _achievements: Achievement[]
): number {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Attendance: 40%
  const attendancePercent = calculateAttendancePercentage(attendance, 30);
  const attendanceScore = (attendancePercent / 100) * 40;

  // Daily Activity: 25%
  const recentActivities = activities.filter((a) => new Date(a.createdAt) >= thirtyDaysAgo);
  const activityPoints = Math.min(recentActivities.length * 2, 100);
  const activityScore = (activityPoints / 100) * 25;

  // Task Completion: 25%
  const taskActivities = recentActivities.filter(
    (a) =>
      a.activityType === "TASK_COMPLETED" ||
      a.activityType === "ASSIGNMENT_SUBMITTED" ||
      a.activityType === "CODE_SUBMITTED"
  );
  const taskCompletionScore = Math.min(taskActivities.length * 5, 25);

  // Consistency/Streak: 10%
  const streakDays = calculateCurrentStreak(attendance);
  const streakScore = Math.min((streakDays / 30) * 10, 10);

  const totalScore = attendanceScore + activityScore + taskCompletionScore + streakScore;
  return Math.round(totalScore);
}

export function calculateCurrentStreak(attendanceRecords: Attendance[]): number {
  if (!attendanceRecords.length) return 0;

  const sorted = [...attendanceRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const record of sorted) {
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - streak);
    expectedDate.setHours(0, 0, 0, 0);

    if (recordDate.getTime() === expectedDate.getTime() && record.status === "PRESENT") {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function calculateLongestStreak(attendanceRecords: Attendance[]): number {
  if (!attendanceRecords.length) return 0;

  const sorted = [...attendanceRecords]
    .filter((a) => a.status === "PRESENT")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let maxStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);

    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      currentStreak++;
    } else {
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 1;
    }
  }

  return Math.max(maxStreak, currentStreak);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function getDaysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getHeatmapData(activities: Activity[], year: number) {
  const heatmapData: { date: string; count: number }[] = [];
  const activityMap: { [key: string]: number } = {};

  activities.forEach((activity) => {
    const date = new Date(activity.createdAt);
    if (date.getFullYear() === year) {
      const dateString = date.toISOString().split("T")[0];
      activityMap[dateString] = (activityMap[dateString] || 0) + 1;
    }
  });

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split("T")[0];
    heatmapData.push({
      date: dateString,
      count: activityMap[dateString] || 0,
    });
  }

  return heatmapData;
}

export function checkAtRisk(
  attendancePercent: number,
  productivityScore: number,
  daysNoLogin: number = 5
): boolean {
  return attendancePercent < 75 || productivityScore < 50 || daysNoLogin > 5;
}

export function getProductivityLevel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  if (score >= 30) return "Below Average";
  return "Poor";
}
