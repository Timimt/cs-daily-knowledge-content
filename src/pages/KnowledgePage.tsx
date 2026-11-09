import { useEffect, useMemo, useRef, useState } from "react";
import { FilePenLine, Search, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { DashboardResponse, LessonSummary } from "../shared/types";
import { apiFetch, errorMessage } from "../lib/api";
import { EmptyState, ErrorState, LoadingState } from "../components/Feedback";
import { LessonCard } from "../components/LessonCard";
import { cn } from "../lib/format";
import { useAuth } from "../lib/auth";

type LessonListResponse = {
  lessons: LessonSummary[];
  query: string;
  category: string;
};

export function KnowledgePage() {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, "completed" | "bookmarked">>({});
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (auth.loading) return;
    apiFetch<DashboardResponse>("/api/dashboard")
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, [auth.authenticated, auth.loading]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQuery) next.set("q", debouncedQuery);
    if (category) next.set("category", category);
    setSearchParams(next, { replace: true });
  }, [category, debouncedQuery, setSearchParams]);

  useEffect(() => {
    if (auth.loading) return;
    const currentRequest = ++requestId.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    apiFetch<LessonListResponse>(`/api/lessons?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (currentRequest === requestId.current) setLessons(data.lessons);
      })
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError" && currentRequest === requestId.current) {
          setError(errorMessage(caught));
        }
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.authenticated, auth.loading, category, debouncedQuery]);

  const resultDescription = useMemo(() => {
    if (debouncedQuery) return `搜尋「${debouncedQuery}」`;
    if (category) return category;
    return "所有教材";
  }, [category, debouncedQuery]);

  async function updateLesson(
    lessonId: string,
    kind: "completed" | "bookmarked",
    value: boolean,
  ) {
    setBusy((current) => ({ ...current, [lessonId]: kind }));
    try {
      const response = await apiFetch<{ record: LessonSummary["record"] }>(
        `/api/lessons/${lessonId}/record`,
        {
          method: "PATCH",
          body: JSON.stringify({ [kind]: value }),
        },
      );
      setLessons((current) =>
        current.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, record: response.record } : lesson,
        ),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy((current) => {
        const next = { ...current };
        delete next[lessonId];
        return next;
      });
    }
  }

  return (
    <div className="page-container">
      <header>
        <p className="page-kicker">Historical Knowledge</p>
        <h1 className="page-title">歷史知識庫</h1>
        <p className="page-description">
          從 Day、分類或教材內文找到過去學過的內容。收藏與完成狀態會立即寫入本機 SQLite。
        </p>
        <Link to="/admin" className="secondary-button mt-4">
          <FilePenLine size={16} />
          教材管理
        </Link>
      </header>

      <section className="search-panel" aria-label="知識庫搜尋與篩選">
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="search-input"
            placeholder="搜尋 RSA、AES、Windows API、勒索病毒…"
            aria-label="搜尋教材"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQuery("")}
              aria-label="清除搜尋"
            >
              <X size={17} />
            </button>
          )}
        </div>
        <div className="filter-strip" role="group" aria-label="依分類篩選">
          <button
            type="button"
            className={cn("filter-chip", !category && "is-active")}
            onClick={() => setCategory("")}
          >
            全部
          </button>
          {categories.map((item) => (
            <button
              type="button"
              key={item.category}
              className={cn("filter-chip", category === item.category && "is-active")}
              onClick={() =>
                setCategory((current) => (current === item.category ? "" : item.category))
              }
            >
              {item.category} · {item.count}
            </button>
          ))}
        </div>
      </section>

      <div className="mb-2 mt-6 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--muted)]">{resultDescription}</p>
        <p className="text-xs text-[var(--muted)]">{loading ? "搜尋中…" : `${lessons.length} 篇`}</p>
      </div>

      {!auth.loading && !auth.authenticated && (
        <div className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs leading-6 text-[var(--muted)]">
          收藏與完成狀態需要登入。教材搜尋與閱讀目前仍可使用。
          <Link to="/admin/login" state={{ from: "/knowledge" }} className="ml-2 font-bold text-[var(--accent-strong)]">
            前往登入
          </Link>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {!error && loading && lessons.length === 0 && <LoadingState label="搜尋教材中…" />}
      {!error && !loading && lessons.length === 0 && (
        <EmptyState
          title="找不到相關教材"
          message="試試更短的關鍵字、英文技術名稱，或清除分類篩選。"
          action={
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setQuery("");
                setCategory("");
              }}
            >
              清除所有條件
            </button>
          }
        />
      )}
      {!error && lessons.length > 0 && (
        <section className="lesson-grid" aria-label="教材搜尋結果">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              busyKind={busy[lesson.id] ?? null}
              onUpdate={
                auth.authenticated
                  ? (kind, value) => updateLesson(lesson.id, kind, value)
                  : undefined
              }
            />
          ))}
        </section>
      )}
    </div>
  );
}
