import { HashRouter, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import {
  BarChart3,
  Home,
  Library,
  Settings,
} from "lucide-react";
import { useEffect } from "react";
import { LogoMark } from "../components/LogoMark";
import { ThemeToggle } from "../components/ThemeToggle";
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
  { to: "/knowledge", label: "教材", icon: Library },
  { to: "/progress", label: "學習紀錄", icon: BarChart3 },
  { to: "/settings", label: "設定", icon: Settings },
];

function StaticShell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="static-shell">
      <aside className="desktop-sidebar static-sidebar">
        <div className="static-sidebar-brand">
          <LogoMark />
          <ThemeToggle cycleOnly />
        </div>
        <p className="static-nav-label">INDEX</p>
        <nav className="static-sidebar-nav" aria-label="主要導覽">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn("sidebar-link", "static-sidebar-link", isActive && "is-active")
                }
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="static-sidebar-note">
          <span>教材保存在 GitHub</span>
          <span>學習紀錄保存在此裝置</span>
        </div>
      </aside>

      <header className="mobile-header static-mobile-header">
        <LogoMark />
        <ThemeToggle cycleOnly />
      </header>

      <main className="app-main static-main">
        <Outlet />
      </main>

      <nav className="mobile-bottom-nav static-mobile-nav" aria-label="行動版主要導覽">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn("mobile-nav-link", "static-mobile-nav-link", isActive && "is-active")
              }
            >
              <Icon size={19} strokeWidth={1.9} />
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
          <Route path="progress" element={<StaticProgressPage />} />
          <Route path="settings" element={<StaticSettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
