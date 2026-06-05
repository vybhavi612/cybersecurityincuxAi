import { NextRequest } from "next/server";
import { generateText, buildStudentContext } from "@/lib/gemini";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context } = body as {
      message: string;
      context?: {
        attendancePercent: number;
        productivityScore: number;
        currentStreak: number;
        assignmentCompletion: number;
        overdueCount: number;
        pendingCount: number;
        nextDueTitle?: string;
      };
    };

    if (!message?.trim()) {
      return createErrorResponse("Message is required");
    }

    const contextStr = context ? buildStudentContext(context) : "";

    const prompt = `You are a helpful academic performance coach for a student in a college learning platform.
${contextStr ? `Current student data: ${contextStr}` : ""}

Student's question: "${message}"

Reply in 2-3 sentences maximum. Be specific, actionable, and encouraging. Focus on what the student should do next. Do not use markdown or bullet points.`;

    const response = await generateText(prompt, 200);

    if (response.error) {
      return createErrorResponse(response.error, 503);
    }

    return createSuccessResponse({ reply: response.text });
  } catch (error) {
    console.error("AI chat error:", error);
    return createErrorResponse("AI service error", 500);
  }
}
