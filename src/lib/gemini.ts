import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY ?? "";

// Lazy-initialize so the module loads even if the key is empty
let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

// Use the most efficient free-tier model
const MODEL = "gemini-1.5-flash";

export interface GeminiResponse {
  text: string;
  error?: string;
}

export async function generateText(prompt: string, maxTokens = 400): Promise<GeminiResponse> {
  if (!apiKey) {
    return { text: "", error: "Gemini API key not configured." };
  }
  try {
    const model = getClient().getGenerativeModel({
      model: MODEL,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return { text };
  } catch (err: any) {
    console.error("Gemini error:", err?.message ?? err);
    return { text: "", error: err?.message ?? "AI service unavailable." };
  }
}

// Build a compact student-context string for prompts
export function buildStudentContext(ctx: {
  attendancePercent: number;
  productivityScore: number;
  currentStreak: number;
  assignmentCompletion: number;
  overdueCount: number;
  pendingCount: number;
  nextDueTitle?: string;
}): string {
  return (
    `Student metrics: attendance=${ctx.attendancePercent}%, ` +
    `productivity=${ctx.productivityScore}/100, streak=${ctx.currentStreak} days, ` +
    `assignments=${ctx.assignmentCompletion}% complete, overdue=${ctx.overdueCount}, ` +
    `pending=${ctx.pendingCount}` +
    (ctx.nextDueTitle ? `, next due="${ctx.nextDueTitle}"` : "")
  );
}

// Build a compact class-context string for admin prompts
export function buildClassContext(ctx: {
  totalStudents: number;
  presentToday: number;
  avgAttendance: number;
  avgProductivity: number;
  atRiskCount: number;
  assignmentsActive: number;
}): string {
  return (
    `Class of ${ctx.totalStudents} students. ` +
    `Present today: ${ctx.presentToday}. ` +
    `Avg attendance: ${ctx.avgAttendance}%. ` +
    `Avg productivity: ${ctx.avgProductivity}/100. ` +
    `At-risk students: ${ctx.atRiskCount}. ` +
    `Active assignments: ${ctx.assignmentsActive}.`
  );
}
