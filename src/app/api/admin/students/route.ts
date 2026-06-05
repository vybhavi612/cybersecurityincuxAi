import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth, createSuccessResponse, createErrorResponse } from "@/lib/middleware";
import { calculateAttendancePercentage, calculateProductivityScore, calculateCurrentStreak } from "@/lib/calculations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.error;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      include: {
        attendance: {
          where: { date: { gte: thirtyDaysAgo } },
          orderBy: { date: "desc" },
        },
        activities: {
          where: { createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const enriched = students.map((s) => {
      const attendancePercent = calculateAttendancePercentage(s.attendance);
      const productivityScore = calculateProductivityScore(s.attendance, s.activities, []);
      const currentStreak = calculateCurrentStreak(s.attendance);
      const totalActivities = s.activities.length;

      const riskLevel: "low" | "medium" | "high" =
        attendancePercent < 60 || productivityScore < 40
          ? "high"
          : attendancePercent < 75 || productivityScore < 60
            ? "medium"
            : "low";

      const lastActive =
        s.activities.length > 0
          ? s.activities[0].createdAt.toISOString()
          : s.attendance.length > 0
            ? s.attendance[0].date.toISOString()
            : null;

      const daysSinceActive = lastActive
        ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000)
        : 999;
      const status: "active" | "inactive" = daysSinceActive <= 7 ? "active" : "inactive";

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        createdAt: s.createdAt.toISOString(),
        attendancePercent,
        productivityScore,
        currentStreak,
        totalActivities,
        riskLevel,
        status,
        lastActive,
      };
    });

    return createSuccessResponse(enriched);
  } catch (error) {
    console.error("Error fetching enriched students:", error);
    return createErrorResponse("Failed to fetch students", 500);
  }
}
