"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/Card";

export default function AnalyticsPage() {
  return (
    <DashboardLayout role="ADMIN">
      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Platform Analytics</h2>
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
              <p className="font-medium text-slate-900 dark:text-white">Attendance Trend</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Average attendance is stable at 85%</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
              <p className="font-medium text-slate-900 dark:text-white">Productivity Distribution</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Most students are in the 70-85 productivity range</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
              <p className="font-medium text-slate-900 dark:text-white">Engagement Metrics</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Daily active users: 85% of registered students</p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
