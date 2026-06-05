import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromHeader } from "@/lib/auth";
import { Role } from "@/types";

export async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = getTokenFromHeader(authHeader ?? undefined);

  if (!token) {
    return {
      authenticated: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return {
      authenticated: false,
      error: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }

  return {
    authenticated: true,
    user: {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    },
  };
}

export async function verifyAdminAuth(req: NextRequest) {
  const auth = await verifyAuth(req);

  if (!auth.authenticated) {
    return auth;
  }

  if (auth.user?.role !== Role.ADMIN) {
    return {
      authenticated: false,
      error: NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 }),
    };
  }

  return auth;
}

export function createSuccessResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function createErrorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
