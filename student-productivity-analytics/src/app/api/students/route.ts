import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth, createSuccessResponse, createErrorResponse } from "@/lib/middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) {
      return auth.error;
    }

    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return createSuccessResponse(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    return createErrorResponse("Failed to fetch students", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authenticated) {
      return auth.error;
    }

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return createErrorResponse("Name, email, and password are required");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createErrorResponse("Email already in use", 400);
    }

    const { hashPassword } = await import("@/lib/auth");
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "STUDENT",
      },
    });

    return createSuccessResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      201
    );
  } catch (error) {
    console.error("Error creating student:", error);
    return createErrorResponse("Failed to create student", 500);
  }
}
