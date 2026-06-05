import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, generateToken } from "@/lib/auth";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return createErrorResponse("Name, email, and password are required");
    }

    if (password.length < 6) {
      return createErrorResponse("Password must be at least 6 characters");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createErrorResponse("Email already in use", 400);
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "STUDENT",
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    return createSuccessResponse(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      201
    );
  } catch (error) {
    console.error("Signup error:", error);
    return createErrorResponse("Signup failed", 500);
  }
}
