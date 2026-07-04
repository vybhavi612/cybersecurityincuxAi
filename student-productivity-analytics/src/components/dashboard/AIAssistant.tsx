"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import {
  assignments,
  calculateAttendancePercentage,
  calculateProductivityScore,
  getAssignmentStats,
  getCurrentWeekAttendance,
  getProductivityCategory,
} from "@/lib/studentPortalData";

interface ChatMessage {
  sender: "assistant" | "student";
  text: string;
}

const quickPrompts = [
  "How can I improve my score?",
  "What's my most urgent task?",
  "How is my attendance?",
];

// Rule-based fallback for when Gemini API fails
function ruleFallback(question: string, context: { attendancePercent: number; score: number; category: string; urgentTitle?: string }) {
  const q = question.toLowerCase();
  if (q.includes("attendance")) {
    return `Your attendance is ${context.attendancePercent}%. Mark today's attendance and avoid missing any more sessions this week.`;
  }
  if (q.includes("assignment") || q.includes("task") || q.includes("urgent")) {
    return context.urgentTitle
      ? `Focus on "${context.urgentTitle}" first — it's your highest-priority pending task.`
      : "All assignments are submitted. Great work — stay consistent for the next deadline.";
  }
  if (q.includes("score") || q.includes("improve") || q.includes("productivity")) {
    return `Your score is ${context.score}/100 (${context.category}). Attendance has the highest weight, so marking it consistently is the fastest lever to pull.`;
  }
  return `Your score is ${context.score}/100. Focus on today's attendance, your next pending assignment, and maintaining your streak.`;
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "assistant",
      text: "Hi! I'm your AI performance coach powered by Gemini. Ask me anything about your attendance, assignments, or how to boost your score.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const context = useMemo(() => {
    const attendance = getCurrentWeekAttendance();
    const stats = getAssignmentStats(assignments);
    const attendancePercent = calculateAttendancePercentage(attendance);
    const score = calculateProductivityScore({
      attendancePercentage: attendancePercent,
      assignmentCompletionRate: stats.completionPercentage,
      currentStreak: 4,
      timelinessRate: 72,
    });
    const category = getProductivityCategory(score);
    const urgentAssignment = assignments.find((a) => a.status !== "Submitted");
    return {
      attendancePercent,
      productivityScore: score,
      currentStreak: 4,
      assignmentCompletion: stats.completionPercentage,
      overdueCount: stats.overdue,
      pendingCount: stats.pending,
      nextDueTitle: urgentAssignment?.title,
      score: score,
      category: category.label,
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { sender: "student", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context: {
            attendancePercent: context.attendancePercent,
            productivityScore: context.productivityScore,
            currentStreak: context.currentStreak,
            assignmentCompletion: context.assignmentCompletion,
            overdueCount: context.overdueCount,
            pendingCount: context.pendingCount,
            nextDueTitle: context.nextDueTitle,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { sender: "assistant", text: data.reply ?? "No response." }]);
      } else {
        // Fallback to rule-based response
        const fallback = ruleFallback(trimmed, context);
        setMessages((prev) => [...prev, { sender: "assistant", text: fallback }]);
      }
    } catch {
      const fallback = ruleFallback(trimmed, context);
      setMessages((prev) => [...prev, { sender: "assistant", text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[36rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI Coach</p>
                <p className="text-xs text-indigo-200">Powered by Google Gemini</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.sender === "assistant"
                    ? "bg-white text-slate-700 shadow-sm"
                    : "ml-auto bg-indigo-600 text-white"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="flex gap-1.5 bg-white rounded-2xl px-3.5 py-3 shadow-sm w-16">
                {[0, 150, 300].map((d) => (
                  <div key={d} className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts + input */}
          <div className="border-t border-slate-200 bg-white p-3">
            <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                placeholder="Ask about your progress…"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        aria-label="Open AI coach"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:shadow-2xl"
      >
        {open ? <Sparkles className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
