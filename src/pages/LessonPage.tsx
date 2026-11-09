import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Library,
  LockKeyhole,
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { LessonDetail } from "../shared/types";
import { apiFetch, errorMessage } from "../lib/api";
import { dayLabel, formatDate, formatDateTime } from "../lib/format";
import { extractToc } from "../lib/markdown";
import { LessonMarkdown } from "../components/LessonMarkdown";
import { LessonDiagrams } from "../components/LessonDiagram";
import { QuizPanel } from "../components/QuizPanel";
import { ErrorState, LoadingState } from "../components/Feedback";
import { StatusButton } from "../components/StatusButton";
import { useAuth } from "../lib/auth";

const markedRead = new Set<string>();

export function LessonPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const auth = useAuth();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"completed" | "bookmarked" | null>(null);

  useEffect(() => {
    if (auth.loading) return;
    const controller = new AbortController();
    setLesson(null);
    setError(null);
    apiFetch<LessonDetail>(`/api/lessons/${id}`, { signal: controller.signal })
      .then((data) => {
        setLesson(data);
        if (auth.authenticated && !markedRead.has(id)) {
          markedRead.add(id);
          apiFetch<{ record: LessonDetail["record"] }>(`/api/lessons/${id}/read`, {
            method: "POST",
          })
            .then(({ record }) =>
              setLesson((current) => (current ? { ...current, record } : current)),
            )
            .catch(() => {
              // Reading still works if the learning-record write fails.
            });
        }
      })
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError") setError(errorMessage(caught));
      });
    return () => controller.abort();
  }, [auth.authenticated, auth.loading, id]);

  const toc = useMemo(() => (lesson ? extractToc(lesson.content) : []), [lesson]);

  async function updateStatus(kind: "completed" | "bookmarked") {
    if (!lesson || busy) return;
    setBusy(kind);
    try {
      const nextValue = !lesson.record[kind];
      const result = await apiFetch<{ record: LessonDetail["record"] }>(
        `/api/lessons/${lesson.id}/record`,
        {
          method: "PATCH",
          body: JSON.stringify({ [kind]: nextValue }),
        },
      );
      setLesson((current) => (current ? { ...current, record: result.record } : current));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  function updateScore(score: number, total: number) {
    setLesson((current) =>
      current
        ? {
            ...current,
            record: {
              ...current.record,
              quizScore: score,
              quizTotal: total,
              updatedAt: new Date().toISOString(),
            },
          }
        : current,
    );
  }

  if (error && !lesson) {
    return (
      <div className="reading-container">
        <ErrorState
          title="無法開啟教材"
          message={error}
          action={
            <Link to="/knowledge" className="secondary-button">
              回到知識庫
            </Link>
          }
        />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="reading-container">
        <LoadingState label="正在載入教材…" />
      </div>
    );
  }

  const tocContent = (
    <ul className="toc-list">
      {toc.map((heading) => (
        <li key={`${heading.id}-${heading.text}`} data-level={heading.level}>
          <a href={`#${heading.id}`}>{heading.text}</a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="reading-container">
      <Link to="/knowledge" className="lesson-breadcrumb">
        <ArrowLeft size={15} />
        回到知識庫
      </Link>

      {!auth.loading && !auth.authenticated && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-2">
            <LockKeyhole size={15} className="text-[var(--accent-strong)]" />
            登入後才能保存完成、收藏、閱讀時間與測驗成績。
          </span>
          <Link
            to="/admin/login"
            state={{ from: location.pathname }}
            className="font-bold text-[var(--accent-strong)]"
          >
            登入
          </Link>
        </div>
      )}

      <div className="lesson-layout">
        <article className="min-w-0">
          <header className="lesson-header">
            <div className="flex flex-wrap items-center gap-2">
              <span className="meta-pill is-accent">{dayLabel(lesson.day)}</span>
              <span className="meta-pill">{lesson.category}</span>
              {lesson.record.completed && <span className="meta-pill is-success">已完成</span>}
            </div>
            <h1>{lesson.title}</h1>
            <p className="lesson-summary">{lesson.summary}</p>
            <div className="lesson-meta">
              <span className="meta-pill">
                <CalendarDays size={13} className="mr-1.5" />
                {formatDate(lesson.date)}
              </span>
              <span className="meta-pill">
                <Clock3 size={13} className="mr-1.5" />
                {lesson.estimatedMinutes} 分鐘
              </span>
              <span className="meta-pill">
                <BookOpen size={13} className="mr-1.5" />
                已閱讀 {lesson.record.readCount} 次
              </span>
              {lesson.record.quizTotal && (
                <span className="meta-pill is-success">
                  最近測驗 {lesson.record.quizScore} / {lesson.record.quizTotal}
                </span>
              )}
            </div>
            <div className="lesson-actions">
              <StatusButton
                kind="completed"
                active={lesson.record.completed}
                busy={busy === "completed"}
                onToggle={() => updateStatus("completed")}
              />
              <StatusButton
                kind="bookmarked"
                active={lesson.record.bookmarked}
                busy={busy === "bookmarked"}
                onToggle={() => updateStatus("bookmarked")}
              />
            </div>
            {lesson.record.lastReadAt && (
              <p className="mt-3 text-[11px] text-[var(--muted)]">
                最近閱讀：{formatDateTime(lesson.record.lastReadAt)}
              </p>
            )}
          </header>

          <details className="mobile-toc mt-5">
            <summary>本文目錄 · {toc.length} 個章節</summary>
            <nav aria-label="手機版文章目錄">{tocContent}</nav>
          </details>

          <div className="article-panel">
            <LessonDiagrams images={lesson.images} />
            <LessonMarkdown content={lesson.content} />

            <section className="mt-10 border-t border-[var(--line)] pt-7">
              <div className="flex items-center gap-2">
                <Library size={18} className="text-[var(--accent-strong)]" />
                <h2 className="text-xl font-extrabold tracking-[-0.025em]">相關知識節點</h2>
              </div>
              <div className="related-topics">
                {lesson.relatedTopics.map((topic) => (
                  <span key={topic} className="meta-pill">
                    {topic}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-9">
              <h2 className="text-xl font-extrabold tracking-[-0.025em]">參考資料</h2>
              <div className="mt-4 grid gap-2">
                {lesson.references.map((reference) => (
                  <a
                    key={reference.url}
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex min-h-[62px] items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-[var(--line-strong)]"
                  >
                    <span>
                      <strong className="block text-sm font-semibold">{reference.title}</strong>
                      <span className="mt-1 block text-[11px] text-[var(--muted)]">
                        {reference.publisher}
                      </span>
                    </span>
                    <ExternalLink size={16} className="shrink-0 text-[var(--muted)]" />
                  </a>
                ))}
              </div>
            </section>

            <QuizPanel
              lessonId={lesson.id}
              questions={lesson.quiz}
              onScored={updateScore}
              canSubmit={auth.authenticated}
            />

            <section className="mt-10 rounded-2xl border border-[color-mix(in_srgb,var(--success)_28%,var(--line))] bg-[var(--success-soft)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-extrabold">今天的內容讀完了嗎？</h2>
                  <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                    標記完成會更新首頁的連續學習天數與完成率。
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => updateStatus("completed")}
                  disabled={busy === "completed"}
                >
                  <CheckCircle2 size={17} />
                  {lesson.record.completed ? "取消完成" : "完成本課"}
                </button>
              </div>
            </section>
          </div>
        </article>

        <aside className="toc-card surface-card" aria-label="文章目錄">
          <h2>On this page</h2>
          <nav>{tocContent}</nav>
        </aside>
      </div>
    </div>
  );
}
