import { NextRequest } from "next/server";
import { generateText, buildClassContext } from "@/lib/gemini";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, context } = body as {
      type: "dashboard" | "at_risk" | "recommendations" | "summary";
      context: {
        totalStudents: number;
        presentToday: number;
        avgAttendance: number;
        avgProductivity: number;
        atRiskCount: number;
        assignmentsActive: number;
        atRiskNames?: string[];
        topPerformerNames?: string[];
      };
    };

    if (!context) {
      return createErrorResponse("Context required");
    }

    const contextStr = buildClassContext(context);

    const prompts: Record<string, string> = {
      dashboard: `You are an educational analytics AI for a college admin dashboard.
${contextStr}
${context.atRiskNames?.length ? `At-risk students: ${context.atRiskNames.slice(0, 3).join(", ")}.` : ""}
${context.topPerformerNames?.length ? `Top performers: ${context.topPerformerNames.slice(0, 3).join(", ")}.` : ""}

Provide 3 brief, actionable insights for the administrator. Each insight should be one sentence. Focus on attendance trends, at-risk intervention, and performance improvement. Format as a JSON array of strings: ["insight1", "insight2", "insight3"]`,

      at_risk: `You are an educational analytics AI.
${contextStr}
${context.atRiskNames?.length ? `Students at risk: ${context.atRiskNames.join(", ")}.` : "No at-risk students identified."}

For each at-risk student group, suggest one specific intervention the admin can take. Keep response under 150 words. Format as plain text.`,

      recommendations: `You are an educational analytics AI advising a college administrator.
${contextStr}

Generate 3 strategic recommendations to improve class performance. Each recommendation should be actionable and specific. Format as JSON: [{"title": "...", "description": "..."}]`,

      summary: `Summarize this class performance data in 2 sentences for an admin report.
${contextStr}
Be factual and professional.`,
    };

    const prompt = prompts[type] ?? prompts.dashboard;
    const response = await generateText(prompt, 350);

    if (response.error) {
      return createErrorResponse(response.error, 503);
    }

    // For JSON-returning types, parse the response
    if (type === "dashboard" || type === "recommendations") {
      try {
        const jsonMatch = response.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return createSuccessResponse({ data: parsed, raw: response.text });
        }
      } catch {
        // Return raw text if JSON parse fails
      }
    }

    return createSuccessResponse({ data: response.text });
  } catch (error) {
    console.error("Admin insights error:", error);
    return createErrorResponse("AI insights error", 500);
  }
}
