"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-lg bg-slate-950 dark:bg-cyan-400" />
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Opening student portal</h1>
        <p className="text-slate-600 dark:text-slate-400">Preparing your workspace</p>
      </div>
    </div>
  );
}
