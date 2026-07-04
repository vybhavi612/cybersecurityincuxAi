import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, verifyPassword } from "@/lib/auth";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return createErrorResponse("Email and password are required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return createErrorResponse("Invalid email or password", 401);
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return createErrorResponse("Invalid email or password", 401);
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    return createSuccessResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return createErrorResponse("Login failed", 500);
  }
}
