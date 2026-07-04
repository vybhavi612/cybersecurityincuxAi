import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}

export function StatCard({ label, value, icon, trend, color = "blue" }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trend.direction === "up" ? "text-green-600" : "text-red-600"}`}>
              {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && <div className={`rounded-lg p-3 ${colorClasses[color]}`}>{icon}</div>}
      </div>
    </Card>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  color?: "blue" | "green" | "yellow" | "red";
}

export function ProgressBar({ label, value, max = 100, color = "blue" }: ProgressBarProps) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-full ${colorClasses[color]}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  type?: "success" | "warning" | "danger" | "info";
}

export function Badge({ children, type = "info" }: BadgeProps) {
  const typeClasses = {
    success: "badge-success",
    warning: "badge-warning",
    danger: "badge-danger",
    info: "badge-info",
  };

  return <span className={`badge ${typeClasses[type]}`}>{children}</span>;
}
