import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  FilePlus2,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import type {
  ManagedLessonSummary,
  PublicationStatus,
} from "../shared/admin-types";
import { apiFetch, errorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import { ErrorState, LoadingState } from "../components/Feedback";
import { cn } from "../lib/format";

function publicationLabel(status: PublicationStatus) {
  if (status === "published") return "已發布";
  if (status === "archived") return "已封存";
  return "草稿";
}

export function AdminLessonsPage() {
  const auth = useAuth();
  const [lessons, setLessons] = useState<ManagedLessonSummary[]>([]);
  const [filter, setFilter] = useState<"all" | PublicationStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ lessons: ManagedLessonSummary[] }>(
        "/api/admin/lessons",
      );
      setLessons(result.lessons);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? lessons
        : lessons.filter((lesson) => lesson.publishedStatus === filter),
    [filter, lessons],
  );

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <p className="page-kicker">Content Workspace</p>
          <h1 className="page-title">教材管理</h1>
          <p className="page-description">
            SQLite 保存工作版本、發布狀態與學習資料；GitHub 同步是另一個獨立狀態。
          </p>
        </header>
        <div className="flex gap-2">
          <button type="button" className="secondary-button" onClick={() => void load()}>
            <RefreshCw size={16} />
            重新整理
          </button>
          <button type="button" className="secondary-button" onClick={() => void auth.logout()}>
            <LogOut size={16} />
            登出
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="filter-strip mt-0">
          {(["all", "draft", "published", "archived"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={cn("filter-chip", filter === status && "is-active")}
              onClick={() => setFilter(status)}
            >
              {status === "all" ? "全部" : publicationLabel(status)}
            </button>
          ))}
        </div>
        <Link to="/admin/lessons/new" className="primary-button">
          <FilePlus2 size={17} />
          新增教材
        </Link>
      </div>

      {error && <ErrorState message={error} action={<button onClick={() => void load()} className="secondary-button">重試</button>} />}
      {!error && loading && <LoadingState label="正在載入教材管理資料…" />}
      {!error && !loading && filtered.length === 0 && (
        <div className="state-panel mt-5">
          <ShieldCheck size={28} className="text-[var(--accent)]" />
          <div>
            <h2>沒有符合條件的教材</h2>
            <p>建立第一份 Draft，或切換狀態篩選。</p>
          </div>
        </div>
      )}
      {!error && !loading && filtered.length > 0 && (
        <div className="admin-lesson-list mt-5">
          {filtered.map((lesson) => (
            <Link
              key={lesson.id}
              to={`/admin/lessons/${lesson.id}`}
              className="admin-lesson-row"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`status-badge status-${lesson.publishedStatus}`}>
                    {publicationLabel(lesson.publishedStatus)}
                  </span>
                  <span className={`sync-badge sync-${lesson.githubSyncStatus}`}>
                    GitHub: {lesson.githubSyncStatus}
                  </span>
                  {lesson.hasUnpublishedChanges && (
                    <span className="status-badge status-warning">有未發布變更</span>
                  )}
                </div>
                <h2>{lesson.title}</h2>
                <p>
                  DAY {String(lesson.day).padStart(3, "0")} · {lesson.category} · 更新{" "}
                  {formatDateTime(lesson.updatedAt)}
                </p>
                {lesson.latestSyncError && (
                  <p className="mt-2 text-[var(--danger)]">{lesson.latestSyncError}</p>
                )}
              </div>
              <ArrowUpRight size={18} className="shrink-0 text-[var(--muted)]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
