import { useEffect } from "react";
import {
  BarChart3,
  BookOpen,
  Home,
  Library,
  Settings,
  Sparkles,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "../lib/format";
import { LogoMark } from "./LogoMark";
import { ThemeToggle } from "./ThemeToggle";

const navigation = [
  { to: "/", label: "首頁", icon: Home, end: true },
  { to: "/knowledge", label: "知識庫", icon: Library },
  { to: "/ai", label: "AI 搜尋", icon: Sparkles },
  { to: "/progress", label: "學習紀錄", icon: BarChart3 },
  { to: "/settings", label: "設定", icon: Settings },
];

export function AppShell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <aside className="desktop-sidebar">
        <div className="flex items-center justify-between px-2">
          <LogoMark />
          <ThemeToggle />
        </div>
        <nav className="mt-10 space-y-1" aria-label="主要導覽">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn("sidebar-link", isActive && "is-active")}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
            <span className="status-dot" />
            Phase 2 · Protected workspace
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            學習紀錄保存在 SQLite；教材版本與同步狀態由後端安全控管。
          </p>
        </div>
      </aside>

      <header className="mobile-header">
        <LogoMark />
        <ThemeToggle />
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="mobile-bottom-nav" aria-label="行動版主要導覽">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn("mobile-nav-link", isActive && "is-active")}
            >
              <Icon size={20} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
