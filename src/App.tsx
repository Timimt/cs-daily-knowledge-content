import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoadingState } from "./components/Feedback";
import { AdminGuard } from "./components/AdminGuard";

const LessonPage = lazy(() =>
  import("./pages/LessonPage").then((module) => ({ default: module.LessonPage })),
);
const AiDemoPage = lazy(() =>
  import("./pages/AiDemoPage").then((module) => ({ default: module.AiDemoPage })),
);
const ProgressPage = lazy(() =>
  import("./pages/ProgressPage").then((module) => ({ default: module.ProgressPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);
const AdminLoginPage = lazy(() =>
  import("./pages/AdminLoginPage").then((module) => ({ default: module.AdminLoginPage })),
);
const AdminLessonsPage = lazy(() =>
  import("./pages/AdminLessonsPage").then((module) => ({ default: module.AdminLessonsPage })),
);
const AdminLessonEditorPage = lazy(() =>
  import("./pages/AdminLessonEditorPage").then((module) => ({
    default: module.AdminLessonEditorPage,
  })),
);

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="page-container">
          <LoadingState label="正在載入頁面…" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route
            path="lessons/:id"
            element={
              <LazyPage>
                <LessonPage />
              </LazyPage>
            }
          />
          <Route
            path="ai"
            element={
              <LazyPage>
                <AiDemoPage />
              </LazyPage>
            }
          />
          <Route
            path="progress"
            element={
              <LazyPage>
                <ProgressPage />
              </LazyPage>
            }
          />
          <Route
            path="settings"
            element={
              <LazyPage>
                <SettingsPage />
              </LazyPage>
            }
          />
          <Route
            path="admin/login"
            element={
              <LazyPage>
                <AdminLoginPage />
              </LazyPage>
            }
          />
          <Route path="admin" element={<AdminGuard />}>
            <Route
              index
              element={
                <LazyPage>
                  <AdminLessonsPage />
                </LazyPage>
              }
            />
            <Route
              path="lessons/new"
              element={
                <LazyPage>
                  <AdminLessonEditorPage />
                </LazyPage>
              }
            />
            <Route
              path="lessons/:id"
              element={
                <LazyPage>
                  <AdminLessonEditorPage />
                </LazyPage>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
