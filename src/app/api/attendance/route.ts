import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth, createSuccessResponse, createErrorResponse } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return auth.error;
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || auth.user?.id;
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attendance = await prisma.attendance.findMany({
      where: {
        studentId: studentId,
        date: { gte: startDate },
      },
      orderBy: { date: "desc" },
    });

    return createSuccessResponse(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return createErrorResponse("Failed to fetch attendance", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return auth.error;
    }

    const { date, status, loginTime, logoutTime, duration } = await req.json();

    if (!date || !status) {
      return createErrorResponse("Date and status are required");
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId: auth.user!.id,
          date: new Date(date),
        },
      },
      create: {
        studentId: auth.user!.id,
        date: new Date(date),
        status,
        loginTime: loginTime ? new Date(loginTime) : undefined,
        logoutTime: logoutTime ? new Date(logoutTime) : undefined,
        duration: duration || 0,
      },
      update: {
        status,
        loginTime: loginTime ? new Date(loginTime) : undefined,
        logoutTime: logoutTime ? new Date(logoutTime) : undefined,
        duration: duration || 0,
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        studentId: auth.user!.id,
        activityType: "ATTENDANCE_MARKED",
        points: 5,
      },
    });

    return createSuccessResponse(attendance, 201);
  } catch (error) {
    console.error("Error marking attendance:", error);
    return createErrorResponse("Failed to mark attendance", 500);
  }
}
