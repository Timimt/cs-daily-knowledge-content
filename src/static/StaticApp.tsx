import { HashRouter, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import {
  BarChart3,
  Home,
  Library,
  Settings,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";
import { LogoMark } from "../components/LogoMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { AiDemoPage } from "../pages/AiDemoPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { cn } from "../lib/format";
import {
  StaticDashboardPage,
  StaticKnowledgePage,
  StaticLessonPage,
  StaticProgressPage,
  StaticSettingsPage,
} from "./StaticPages";

const navigation = [
  { to: "/", label: "首頁", icon: Home, end: true },
  { to: "/knowledge", label: "知識庫", icon: Library },
  { to: "/ai", label: "AI 搜尋", icon: Sparkles },
  { to: "/progress", label: "學習紀錄", icon: BarChart3 },
  { to: "/settings", label: "設定", icon: Settings },
];

function StaticShell() {
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
            GitHub Pages · Static
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            教材來自 GitHub；收藏、進度與測驗紀錄只保存在目前的瀏覽器。
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

export function StaticApp() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<StaticShell />}>
          <Route index element={<StaticDashboardPage />} />
          <Route path="knowledge" element={<StaticKnowledgePage />} />
          <Route path="lessons/:id" element={<StaticLessonPage />} />
          <Route path="ai" element={<AiDemoPage />} />
          <Route path="progress" element={<StaticProgressPage />} />
          <Route path="settings" element={<StaticSettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
