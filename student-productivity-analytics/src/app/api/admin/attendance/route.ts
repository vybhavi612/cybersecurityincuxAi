import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth, createSuccessResponse, createErrorResponse } from "@/lib/middleware";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) return auth.error;

    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") ?? "30"), 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } });

    // Fetch all attendance in range
    const records = await prisma.attendance.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: "asc" },
    });

    // Group by date
    const byDate = new Map<string, { present: number; absent: number; late: number }>();
    for (const r of records) {
      const key = r.date.toISOString().slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, { present: 0, absent: 0, late: 0 });
      const entry = byDate.get(key)!;
      if (r.status === "PRESENT") entry.present++;
      else if (r.status === "LATE") entry.late++;
      else entry.absent++;
    }

    // Build daily array (only weekdays with records)
    const daily = Array.from(byDate.entries())
      .filter(([, v]) => v.present + v.late + v.absent > 0)
      .slice(-days)
      .map(([date, v]) => ({
        date,
        label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        present: v.present,
        late: v.late,
        absent: v.absent,
        total: totalStudents,
      }));

    // Build weekly summary (last 6 weeks)
    const weekly = Array.from({ length: 6 }, (_, i) => {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (5 - i) * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(23, 59, 59, 999);

      const weekRecords = records.filter(
        (r) => r.date >= weekStart && r.date <= weekEnd
      );
      const present = weekRecords.filter((r) => r.status === "PRESENT").length;
      const late = weekRecords.filter((r) => r.status === "LATE").length;
      const absent = weekRecords.filter((r) => r.status === "ABSENT").length;

      return { week: `Wk ${i + 1}`, present, late, absent };
    });

    return createSuccessResponse({ daily, weekly, totalStudents });
  } catch (error) {
    console.error("Error fetching admin attendance:", error);
    return createErrorResponse("Failed to fetch attendance", 500);
  }
}
