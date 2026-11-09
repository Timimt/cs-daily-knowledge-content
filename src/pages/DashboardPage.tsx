import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookCheck,
  BookOpen,
  CalendarDays,
  Flame,
  LockKeyhole,
  Library,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { DashboardResponse } from "../shared/types";
import { apiFetch, errorMessage } from "../lib/api";
import { dayLabel, formatDate, formatDateTime } from "../lib/format";
import { ErrorState, LoadingState } from "../components/Feedback";
import { useAuth } from "../lib/auth";

export function DashboardPage() {
  const auth = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.loading) return;
    const controller = new AbortController();
    apiFetch<DashboardResponse>("/api/dashboard", { signal: controller.signal })
      .then(setData)
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError") setError(errorMessage(caught));
      });
    return () => controller.abort();
  }, [auth.authenticated, auth.loading]);

  if (error) {
    return (
      <div className="page-container">
        <ErrorState message={error} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="page-container">
        <LoadingState label="正在整理你的今日學習 overview…" />
      </div>
    );
  }

  const progressPercent =
    data.totalLessons === 0 ? 0 : Math.round((data.completedCount / data.totalLessons) * 100);

  return (
    <div className="page-container">
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Personal CS Knowledge Base</p>
          <h1 className="page-title">今天，理解一個真正有用的觀念。</h1>
        </div>
      </header>

      {!auth.loading && !auth.authenticated && (
        <Link
          to="/admin/login"
          state={{ from: "/" }}
          className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs font-semibold"
        >
          <span className="inline-flex items-center gap-2">
            <LockKeyhole size={16} className="text-[var(--accent-strong)]" />
            登入後可保存收藏、完成狀態與測驗紀錄
          </span>
          <span className="text-[var(--accent-strong)]">登入 →</span>
        </Link>
      )}

      <section className="dashboard-hero" aria-labelledby="today-lesson-title">
        <div className="hero-content">
          <div className="hero-kicker">
            <span>{dayLabel(data.todayLesson.day)}</span>
            <span aria-hidden="true">·</span>
            <span>{data.todayLesson.category}</span>
          </div>
          <h2 id="today-lesson-title" className="hero-title">
            {data.todayLesson.title}
          </h2>
          <p className="hero-summary">{data.todayLesson.summary}</p>
          <div className="hero-actions">
            <Link to={`/lessons/${data.todayLesson.id}`} className="hero-primary">
              開始今日課程
              <ArrowRight size={17} />
            </Link>
            <Link to="/knowledge" className="hero-secondary">
              <Library size={17} />
              前往知識庫
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-[11px] font-semibold text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} />
              {formatDate(data.todayLesson.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen size={14} />
              預估 {data.todayLesson.estimatedMinutes} 分鐘
            </span>
            <span>{data.todayLesson.record.completed ? "已完成" : "尚未完成"}</span>
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="學習統計">
        <article className="stat-card">
          <span className="stat-icon">
            <Flame size={18} />
          </span>
          <div className="stat-value">{data.streak}</div>
          <p className="stat-label">連續學習天數</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon">
            <BookCheck size={18} />
          </span>
          <div className="stat-value">
            {data.completedCount}
            <span className="text-sm font-medium text-[var(--muted)]"> / {data.totalLessons}</span>
          </div>
          <p className="stat-label">已完成課程</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon">
            <Library size={18} />
          </span>
          <div className="stat-value">{data.categories.length}</div>
          <p className="stat-label">學習分類</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon">
            <Sparkles size={18} />
          </span>
          <div className="stat-value">{progressPercent}%</div>
          <p className="stat-label">整體完成率</p>
        </article>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link to="/knowledge" className="quick-entry">
          <div>
            <span className="stat-icon">
              <Library size={18} />
            </span>
            <h2 className="quick-entry-title">歷史知識庫</h2>
            <p>依 Day、分類與全文搜尋過去的每一篇教材。</p>
          </div>
          <span className="quick-entry-arrow">
            <ArrowRight size={18} />
          </span>
        </Link>
        <Link to="/ai" className="quick-entry">
          <div>
            <span className="stat-icon">
              <Sparkles size={18} />
            </span>
            <h2 className="quick-entry-title">Ask CS Knowledge</h2>
            <p>預覽 Phase 2 的引用式問答介面；目前明確標示為示範資料。</p>
          </div>
          <span className="quick-entry-arrow">
            <ArrowRight size={18} />
          </span>
        </Link>
      </section>

      <div className="dashboard-columns">
        <section aria-labelledby="recent-title">
          <div className="section-heading-row">
            <h2 id="recent-title" className="section-heading">
              最近學習
            </h2>
            <Link to="/progress" className="section-link">
              查看全部
              <ArrowRight size={14} />
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <div className="surface-card px-5 py-8 text-center">
              <BookOpen className="mx-auto text-[var(--muted)]" size={25} />
              <p className="mt-3 text-sm font-semibold text-[var(--text)]">還沒有閱讀紀錄</p>
              <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                打開今日課程後，最近閱讀時間會自動寫入資料庫。
              </p>
            </div>
          ) : (
            <div className="recent-list">
              {data.recent.map((lesson) => (
                <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="recent-row">
                  <span className="recent-day">D{String(lesson.day).padStart(3, "0")}</span>
                  <div className="min-w-0">
                    <h3>{lesson.title}</h3>
                    <p>
                      {formatDateTime(lesson.lastReadAt)} ·{" "}
                      {lesson.record.completed ? "已完成" : "閱讀中"}
                    </p>
                  </div>
                  <ArrowRight className="text-[var(--muted)]" size={16} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="surface-card p-5" aria-labelledby="category-title">
          <div className="section-heading-row">
            <h2 id="category-title" className="section-heading">
              分類分布
            </h2>
          </div>
          {data.categories.map((item) => {
            const percentage = Math.round((item.count / data.totalLessons) * 100);
            return (
              <div key={item.category} className="category-row">
                <div className="category-row-header">
                  <span>{item.category}</span>
                  <span className="text-[var(--muted)]">{item.count} 篇</span>
                </div>
                <div className="category-track">
                  <div className="category-fill" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
