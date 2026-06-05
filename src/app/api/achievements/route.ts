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

    const achievements = await prisma.achievement.findMany({
      where: { studentId: studentId },
      orderBy: { earnedAt: "desc" },
    });

    return createSuccessResponse(achievements);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return createErrorResponse("Failed to fetch achievements", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated) {
      return auth.error;
    }

    const { title, description, badge } = await req.json();

    if (!title || !badge) {
      return createErrorResponse("Title and badge are required");
    }

    const achievement = await prisma.achievement.create({
      data: {
        studentId: auth.user!.id,
        title,
        description: description || undefined,
        badge,
      },
    });

    return createSuccessResponse(achievement, 201);
  } catch (error) {
    console.error("Error creating achievement:", error);
    return createErrorResponse("Failed to create achievement", 500);
  }
}
