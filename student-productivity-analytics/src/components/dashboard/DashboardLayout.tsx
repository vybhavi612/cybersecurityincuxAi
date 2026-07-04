"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Menu,
  Trophy,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { AIAssistant } from "@/components/dashboard/AIAssistant";

interface LayoutProps {
  children: React.ReactNode;
  role?: "ADMIN" | "STUDENT";
}

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

const studentNav: NavigationItem[] = [
  { label: "Home", href: "/dashboard", icon: Home, iconColor: "text-indigo-300", iconBg: "bg-indigo-500/20" },
  { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck, iconColor: "text-emerald-300", iconBg: "bg-emerald-500/20" },
  { label: "Assignments", href: "/dashboard/assignments", icon: ClipboardList, iconColor: "text-blue-300", iconBg: "bg-blue-500/20" },
  { label: "Analytics", href: "/dashboard/analytics", icon: TrendingUp, iconColor: "text-violet-300", iconBg: "bg-violet-500/20" },
  { label: "Achievements", href: "/dashboard/achievements", icon: Trophy, iconColor: "text-amber-300", iconBg: "bg-amber-500/20" },
];

const adminNav: NavigationItem[] = [
  { label: "Dashboard", href: "/admin", icon: BarChart3, iconColor: "text-violet-300", iconBg: "bg-violet-500/20" },
  { label: "Students", href: "/admin/students", icon: Users, iconColor: "text-blue-300", iconBg: "bg-blue-500/20" },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarDays, iconColor: "text-emerald-300", iconBg: "bg-emerald-500/20" },
  { label: "Assignments", href: "/admin/assignments", icon: ClipboardList, iconColor: "text-amber-300", iconBg: "bg-amber-500/20" },
  { label: "Reports", href: "/admin/reports", icon: FileText, iconColor: "text-rose-300", iconBg: "bg-rose-500/20" },
];

function SidebarContent({
  navigationItems,
  pathname,
  role,
  onLogout,
  onNavigate,
}: {
  navigationItems: NavigationItem[];
  pathname: string;
  role: "ADMIN" | "STUDENT";
  onLogout: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-lg shadow-indigo-500/30">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-white">EduPortal</p>
          <p className="text-xs text-slate-400">{role === "ADMIN" ? "Admin Console" : "Student Hub"}</p>
        </div>
      </div>

      {/* Section label */}
      <div className="px-6 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {role === "ADMIN" ? "Administration" : "My Space"}
        </p>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
        {navigationItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={pathname === item.href}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Student profile chip */}
      {role === "STUDENT" && (
        <div className="mx-3 mb-4 rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-sm font-bold text-white shadow">
              AK
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">Alex Kumar</p>
              <p className="text-xs text-slate-400">CS · Semester 4</p>
            </div>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-rose-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavigationItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? "bg-white/15 text-white shadow-sm"
          : "text-slate-400 hover:bg-white/10 hover:text-slate-200"
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active ? item.iconBg : "bg-transparent"
        }`}
      >
        <Icon className={`h-4 w-4 ${active ? "text-white" : item.iconColor}`} />
      </div>
      <span className="flex-1 truncate">{item.label}</span>
      {active && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />}
    </Link>
  );
}

export function DashboardLayout({ children, role = "STUDENT" }: LayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const navigationItems = role === "ADMIN" ? adminNav : studentNav;
  const currentPage =
    navigationItems.find((item) => item.href === pathname)?.label ??
    (role === "ADMIN" ? "Admin Dashboard" : "Dashboard");

  const sidebarProps = {
    navigationItems,
    pathname,
    role,
    onLogout: handleLogout,
    onNavigate: () => setMobileSidebarOpen(false),
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 md:block md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-60 overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950">
            <div className="flex justify-end p-3">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent {...sidebarProps} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-xl md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                  {role === "ADMIN" ? "Administration" : "Student workspace"}
                </p>
                <h1 className="text-xl font-bold leading-tight text-slate-900">{currentPage}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="hidden text-sm text-slate-400 sm:block">
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                Spring Term
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-6 md:pb-6">{children}</div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-around px-1 py-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
                    active ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className={`text-[9px] font-semibold ${active ? "text-indigo-600" : "text-slate-400"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {role === "STUDENT" && <AIAssistant />}
    </div>
  );
}
