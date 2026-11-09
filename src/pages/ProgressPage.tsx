import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookCheck,
  BrainCircuit,
  Flame,
} from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import type { ProgressResponse } from "../shared/types";
import { apiFetch, errorMessage } from "../lib/api";
import { dayLabel, formatDateTime } from "../lib/format";
import { ErrorState, LoadingState } from "../components/Feedback";
import { useAuth } from "../lib/auth";

export function ProgressPage() {
  const auth = useAuth();
  const location = useLocation();
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.loading || !auth.authenticated) return;
    const controller = new AbortController();
    apiFetch<ProgressResponse>("/api/progress", { signal: controller.signal })
      .then(setData)
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError") setError(errorMessage(caught));
      });
    return () => controller.abort();
  }, [auth.authenticated, auth.loading]);

  if (!auth.loading && !auth.authenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  if (auth.loading) {
    return (
      <div className="page-container">
        <LoadingState label="正在確認登入狀態…" />
      </div>
    );
  }

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
        <LoadingState label="正在整理學習紀錄…" />
      </div>
    );
  }

  const readCount = data.records.filter((entry) => entry.lastReadAt).length;
  const wrongCount = data.records.reduce(
    (sum, entry) => sum + entry.wrongAnswers.length,
    0,
  );

  return (
    <div className="page-container">
      <header>
        <p className="page-kicker">Learning Record</p>
        <h1 className="page-title">學習紀錄</h1>
        <p className="page-description">
          這裡的閱讀、完成、收藏、測驗分數與錯題都來自 SQLite，重新整理或重啟伺服器後仍會保留。
        </p>
      </header>

      <section className="progress-grid" aria-label="學習進度統計">
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
            <span className="text-sm font-medium text-[var(--muted)]">
              {" "}
              / {data.totalLessons}
            </span>
          </div>
          <p className="stat-label">完成課程</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon">
            <BarChart3 size={18} />
          </span>
          <div className="stat-value">{readCount}</div>
          <p className="stat-label">曾閱讀教材</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon">
            <BrainCircuit size={18} />
          </span>
          <div className="stat-value">
            {data.averageQuizPercent === null ? "—" : `${data.averageQuizPercent}%`}
          </div>
          <p className="stat-label">最近測驗平均</p>
        </article>
      </section>

      <div className="mt-9 grid gap-8 lg:grid-cols-[1.35fr_0.85fr]">
        <section aria-labelledby="progress-lessons-title">
          <div className="section-heading-row">
            <h2 id="progress-lessons-title" className="section-heading">
              教材進度
            </h2>
            <span className="text-[11px] text-[var(--muted)]">
              {wrongCount} 個最近錯題
            </span>
          </div>
          <div className="progress-list">
            {data.records.map(({ lesson, lastReadAt, wrongAnswers }) => (
              <article key={lesson.id} className="progress-row">
                <div className="progress-row-main">
                  <div className="progress-row-title">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span className="meta-pill is-accent">{dayLabel(lesson.day)}</span>
                      <span className="meta-pill">{lesson.category}</span>
                      {lesson.record.completed && <span className="meta-pill is-success">已完成</span>}
                      {lesson.record.bookmarked && <span className="meta-pill">已收藏</span>}
                    </div>
                    <h3>{lesson.title}</h3>
                    <p>
                      最近閱讀 {formatDateTime(lastReadAt)}
                      {lesson.record.quizTotal
                        ? ` · 測驗 ${lesson.record.quizScore} / ${lesson.record.quizTotal}`
                        : " · 尚未作答"}
                    </p>
                  </div>
                  <Link
                    to={`/lessons/${lesson.id}`}
                    className="touch-target inline-flex shrink-0 items-center justify-center rounded-xl text-[var(--accent-strong)]"
                    aria-label={`繼續閱讀 ${lesson.title}`}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
                {wrongAnswers.length > 0 && (
                  <div className="wrong-answer-list">
                    {wrongAnswers.map((wrong) => (
                      <div key={wrong.questionId} className="wrong-answer">
                        {wrong.questionId} · 選擇選項 {wrong.selectedOption + 1}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="surface-card p-5" aria-labelledby="attempts-title">
          <div className="section-heading-row">
            <h2 id="attempts-title" className="section-heading">
              測驗嘗試
            </h2>
          </div>
          {data.attempts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line-strong)] p-5 text-center">
              <BrainCircuit className="mx-auto text-[var(--muted)]" size={23} />
              <p className="mt-3 text-sm font-semibold">還沒有測驗紀錄</p>
              <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                完成任何一篇教材的測驗後，分數與錯題會顯示在這裡。
              </p>
            </div>
          ) : (
            <div>
              {data.attempts.map((attempt) => (
                <div key={attempt.id} className="attempt-row">
                  <Link
                    to={`/lessons/${attempt.lessonId}`}
                    className="min-w-0 flex-1 font-semibold hover:text-[var(--accent-strong)]"
                  >
                    <span className="block truncate">{attempt.lessonTitle}</span>
                    <span className="mt-1 block text-[10px] font-normal text-[var(--muted)]">
                      {formatDateTime(attempt.attemptedAt)}
                    </span>
                  </Link>
                  <span className="meta-pill is-accent">
                    {attempt.score} / {attempt.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
