import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, verifyAdminAuth, createSuccessResponse, createErrorResponse } from "@/lib/middleware";
import { calculateAttendancePercentage, calculateProductivityScore, calculateCurrentStreak, calculateLongestStreak } from "@/lib/calculations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return auth.error;
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "student";

    if (type === "admin") {
      const adminAuth = await verifyAdminAuth(req);
      if (!adminAuth.authenticated) {
        return adminAuth.error;
      }

      // Get admin stats
      const totalStudents = await prisma.user.count({
        where: { role: "STUDENT" },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const presentToday = await prisma.attendance.count({
        where: {
          date: { gte: today },
          status: "PRESENT",
        },
      });

      const allAttendance = await prisma.attendance.findMany({
        where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      });

      const avgAttendance = allAttendance.length > 0
        ? Math.round(
            (allAttendance.filter((a) => a.status === "PRESENT").length / allAttendance.length) * 100
          )
        : 0;

      const students = await prisma.user.findMany({
        where: { role: "STUDENT" },
        include: {
          attendance: true,
          activities: true,
        },
      });

      let totalProductivity = 0;
      let atRiskCount = 0;
      let topPerformer = null;
      let maxScore = 0;

      for (const student of students) {
        const score = calculateProductivityScore(student.attendance, student.activities, []);
        totalProductivity += score;

        if (score < 50 || calculateAttendancePercentage(student.attendance) < 75) {
          atRiskCount++;
        }

        if (score > maxScore) {
          maxScore = score;
          topPerformer = student;
        }
      }

      const avgProductivity = students.length > 0 ? Math.round(totalProductivity / students.length) : 0;

      return createSuccessResponse({
        totalStudents,
        presentToday,
        averageAttendance: avgAttendance,
        averageProductivity: avgProductivity,
        topPerformer: topPerformer
          ? {
              id: topPerformer.id,
              name: topPerformer.name,
              email: topPerformer.email,
              score: maxScore,
            }
          : null,
        atRiskStudents: atRiskCount,
      });
    }

    // Get student stats
    const studentAttendance = await prisma.attendance.findMany({
      where: { studentId: auth.user!.id },
    });

    const studentActivities = await prisma.activity.findMany({
      where: { studentId: auth.user!.id },
    });

    const studentAchievements = await prisma.achievement.findMany({
      where: { studentId: auth.user!.id },
    });

    const attendancePercent = calculateAttendancePercentage(studentAttendance);
    const productivityScore = calculateProductivityScore(studentAttendance, studentActivities, studentAchievements);
    const currentStreak = calculateCurrentStreak(studentAttendance);
    const longestStreak = calculateLongestStreak(studentAttendance);

    return createSuccessResponse({
      attendancePercentage: attendancePercent,
      productivityScore,
      currentStreak,
      longestStreak,
      totalActivities: studentActivities.length,
      achievements: studentAchievements,
      recentActivities: studentActivities.slice(0, 10),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return createErrorResponse("Failed to fetch analytics", 500);
  }
}
