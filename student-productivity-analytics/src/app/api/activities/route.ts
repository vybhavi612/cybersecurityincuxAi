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

    const activities = await prisma.activity.findMany({
      where: {
        studentId: studentId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return createErrorResponse("Failed to fetch activities", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return auth.error;
    }

    const { activityType, description, points } = await req.json();

    if (!activityType) {
      return createErrorResponse("Activity type is required");
    }

    const activity = await prisma.activity.create({
      data: {
        studentId: auth.user!.id,
        activityType,
        description: description || undefined,
        points: points || 5,
      },
    });

    return createSuccessResponse(activity, 201);
  } catch (error) {
    console.error("Error creating activity:", error);
    return createErrorResponse("Failed to create activity", 500);
  }
}
