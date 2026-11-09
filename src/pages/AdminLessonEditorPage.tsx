import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CloudUpload,
  Eye,
  FileClock,
  GitCommitHorizontal,
  Save,
  Send,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  LessonEditorInput,
  ManagedLessonDetail,
  ManagedLessonVersion,
} from "../shared/admin-types";
import { EDITOR_CATEGORIES } from "../shared/admin-types";
import { apiFetch, errorMessage } from "../lib/api";
import { LessonMarkdown } from "../components/LessonMarkdown";
import { ErrorState, LoadingState } from "../components/Feedback";
import { cn, formatDateTime } from "../lib/format";

type EditorState = {
  title: string;
  category: string;
  lessonDate: string;
  summary: string;
  markdown: string;
  estimatedMinutes: number;
  tags: string;
  relatedTopics: string;
};

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function emptyEditor(): EditorState {
  return {
    title: "",
    category: EDITOR_CATEGORIES[0],
    lessonDate: today(),
    summary: "",
    markdown: "# 今日知識\n\n## 學習目標\n\n開始撰寫教材。",
    estimatedMinutes: 8,
    tags: "",
    relatedTopics: "",
  };
}

function detailToEditor(lesson: ManagedLessonDetail): EditorState {
  return {
    title: lesson.title,
    category: lesson.category,
    lessonDate: lesson.lessonDate,
    summary: lesson.summary,
    markdown: lesson.markdown,
    estimatedMinutes: lesson.estimatedMinutes,
    tags: lesson.tags.join(", "),
    relatedTopics: lesson.relatedTopics.join(", "),
  };
}

function splitValues(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function AdminLessonEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [lesson, setLesson] = useState<ManagedLessonDetail | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [selectedVersion, setSelectedVersion] =
    useState<ManagedLessonVersion | null>(null);
  const [remoteHistory, setRemoteHistory] = useState<
    Array<{ sha: string; message: string; author: string; authoredAt: string }>
  >([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    apiFetch<ManagedLessonDetail>(`/api/admin/lessons/${id}`, {
      signal: controller.signal,
    })
      .then((value) => {
        setLesson(value);
        setEditor(detailToEditor(value));
        setDirty(false);
      })
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError") setError(errorMessage(caught));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  function change<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setEditor((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setNotice(null);
  }

  const body = useMemo(
    (): LessonEditorInput => ({
      title: editor.title,
      category: editor.category,
      lessonDate: editor.lessonDate,
      summary: editor.summary,
      markdown: editor.markdown,
      estimatedMinutes: editor.estimatedMinutes,
      images: lesson?.images ?? [],
      references: lesson?.references ?? [],
      tags: splitValues(editor.tags),
      relatedTopics: splitValues(editor.relatedTopics),
    }),
    [editor, lesson?.images, lesson?.references],
  );

  async function save() {
    if (busy) return;
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const result = isNew
        ? await apiFetch<{ lesson: ManagedLessonDetail }>("/api/admin/lessons", {
            method: "POST",
            body: JSON.stringify(body),
          })
        : await apiFetch<{ lesson: ManagedLessonDetail }>(
            `/api/admin/lessons/${id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                ...body,
                expectedVersionNumber: lesson?.currentVersionNumber,
              }),
            },
          );
      setLesson(result.lesson);
      setEditor(detailToEditor(result.lesson));
      setDirty(false);
      setNotice("教材工作版本已保存。GitHub 同步與發布狀態仍需分別處理。");
      if (isNew) {
        navigate(`/admin/lessons/${result.lesson.id}`, { replace: true });
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!lesson || busy || dirty) return;
    if (!window.confirm("確認將目前工作版本設為 Published？")) return;
    setBusy("publish");
    setError(null);
    try {
      const result = await apiFetch<{ lesson: ManagedLessonDetail }>(
        `/api/admin/lessons/${lesson.id}/publish`,
        {
          method: "POST",
          body: JSON.stringify({
            expectedVersionNumber: lesson.currentVersionNumber,
          }),
        },
      );
      setLesson(result.lesson);
      setNotice("教材已發布。GitHub 同步狀態不會因此自動改變。");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function archive() {
    if (!lesson || busy) return;
    if (!window.confirm("封存後教材將不再公開顯示，但仍保留版本與學習紀錄。確定封存？")) {
      return;
    }
    setBusy("archive");
    setError(null);
    try {
      const result = await apiFetch<{ lesson: ManagedLessonDetail }>(
        `/api/admin/lessons/${lesson.id}/archive`,
        { method: "POST" },
      );
      setLesson(result.lesson);
      setEditor(detailToEditor(result.lesson));
      setNotice("教材已封存，GitHub 檔案與 SQLite 歷史均保留。");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    if (!lesson || busy || dirty) return;
    setBusy("sync");
    setError(null);
    try {
      const result = await apiFetch<{
        lesson: ManagedLessonDetail;
      }>(`/api/admin/lessons/${lesson.id}/sync`, { method: "POST" });
      setLesson(result.lesson);
      setNotice("GitHub 同步成功，已保存 blob 與 commit 資訊。");
    } catch (caught) {
      setError(errorMessage(caught));
      const refreshed = await apiFetch<ManagedLessonDetail>(
        `/api/admin/lessons/${lesson.id}`,
      ).catch(() => null);
      if (refreshed) setLesson(refreshed);
    } finally {
      setBusy(null);
    }
  }

  async function loadRemoteHistory() {
    if (!lesson?.githubPath || busy) return;
    setBusy("history");
    setError(null);
    try {
      const result = await apiFetch<{
        history: Array<{
          sha: string;
          message: string;
          author: string;
          authoredAt: string;
        }>;
      }>(`/api/admin/lessons/${lesson.id}/github-history?limit=20`);
      setRemoteHistory(result.history);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <LoadingState label="正在載入教材工作區…" />
      </div>
    );
  }
  if (error && !lesson && !isNew) {
    return (
      <div className="page-container">
        <ErrorState
          message={error}
          action={<Link to="/admin" className="secondary-button">回到教材列表</Link>}
        />
      </div>
    );
  }

  const archived = lesson?.publishedStatus === "archived";

  return (
    <div className="page-container">
      <Link to="/admin" className="lesson-breadcrumb">
        <ArrowLeft size={15} />
        回到教材管理
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="page-kicker">{isNew ? "New Draft" : "Lesson Workspace"}</p>
          <h1 className="page-title">{isNew ? "建立新教材" : editor.title}</h1>
          {lesson && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`status-badge status-${lesson.publishedStatus}`}>
                {lesson.publishedStatus}
              </span>
              <span className={`sync-badge sync-${lesson.githubSyncStatus}`}>
                GitHub: {lesson.githubSyncStatus}
              </span>
              {lesson.hasUnpublishedChanges && (
                <span className="status-badge status-warning">未發布變更</span>
              )}
              <span className="meta-pill">v{lesson.currentVersionNumber}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
          >
            {mode === "edit" ? <Eye size={16} /> : <FileClock size={16} />}
            {mode === "edit" ? "預覽" : "回到編輯"}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void save()}
            disabled={Boolean(busy) || archived}
          >
            <Save size={16} />
            {busy === "save" ? "保存中…" : "保存工作版本"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl bg-[var(--danger-soft)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-5 rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm leading-6 text-[var(--success)]">
          {notice}
        </div>
      )}
      {dirty && (
        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-xs leading-6 text-[var(--muted)]">
          目前編輯內容尚未保存。發布或同步前必須先保存，避免誤以為最新內容已上線。
        </div>
      )}

      <div className="admin-editor-layout mt-6">
        <section className="surface-card min-w-0 p-5 sm:p-6">
          {mode === "preview" ? (
            <div>
              <p className="meta-pill is-demo">本機工作版本預覽，不代表 GitHub 已同步</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em]">
                {editor.title || "未命名教材"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{editor.summary}</p>
              <div className="mt-7">
                <LessonMarkdown content={editor.markdown} />
              </div>
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="admin-field sm:col-span-2">
                  <span>標題</span>
                  <input
                    className="field-input"
                    value={editor.title}
                    onChange={(event) => change("title", event.target.value)}
                    disabled={archived}
                  />
                </label>
                <label className="admin-field">
                  <span>分類</span>
                  <select
                    className="field-input"
                    value={editor.category}
                    onChange={(event) => change("category", event.target.value)}
                    disabled={archived}
                  >
                    {EDITOR_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>日期</span>
                  <input
                    type="date"
                    className="field-input"
                    value={editor.lessonDate}
                    onChange={(event) => change("lessonDate", event.target.value)}
                    disabled={archived}
                  />
                </label>
                <label className="admin-field sm:col-span-2">
                  <span>摘要</span>
                  <textarea
                    className="field-textarea min-h-20"
                    value={editor.summary}
                    onChange={(event) => change("summary", event.target.value)}
                    disabled={archived}
                  />
                </label>
                <label className="admin-field">
                  <span>預估分鐘</span>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    className="field-input"
                    value={editor.estimatedMinutes}
                    onChange={(event) => change("estimatedMinutes", Number(event.target.value))}
                    disabled={archived}
                  />
                </label>
                <label className="admin-field">
                  <span>標籤（逗號分隔）</span>
                  <input
                    className="field-input"
                    value={editor.tags}
                    onChange={(event) => change("tags", event.target.value)}
                    disabled={archived}
                  />
                </label>
                <label className="admin-field sm:col-span-2">
                  <span>相關知識節點（逗號分隔）</span>
                  <input
                    className="field-input"
                    value={editor.relatedTopics}
                    onChange={(event) => change("relatedTopics", event.target.value)}
                    disabled={archived}
                  />
                </label>
                <label className="admin-field sm:col-span-2">
                  <span>Markdown</span>
                  <textarea
                    className="field-textarea editor-markdown"
                    value={editor.markdown}
                    onChange={(event) => change("markdown", event.target.value)}
                    disabled={archived}
                    spellCheck={false}
                  />
                </label>
              </div>
            </div>
          )}
        </section>

        {lesson && (
          <aside className="grid content-start gap-4">
            <section className="surface-card p-5">
              <h2 className="section-heading">發布與同步</h2>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                發布控制網站是否顯示目前版本；GitHub 同步只保存 Markdown 與 Git 歷史。
              </p>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  className="primary-button w-full"
                  onClick={() => void publish()}
                  disabled={Boolean(busy) || dirty || archived}
                >
                  <Send size={16} />
                  {busy === "publish" ? "發布中…" : "手動發布目前版本"}
                </button>
                <button
                  type="button"
                  className="secondary-button w-full"
                  onClick={() => void sync()}
                  disabled={Boolean(busy) || dirty || archived}
                >
                  <CloudUpload size={16} />
                  {busy === "sync"
                    ? "同步中…"
                    : lesson.githubSyncStatus === "failed"
                      ? "同步重試"
                      : "同步至 GitHub"}
                </button>
                <button
                  type="button"
                  className="secondary-button w-full text-[var(--danger)]"
                  onClick={() => void archive()}
                  disabled={Boolean(busy) || archived}
                >
                  <Archive size={16} />
                  {archived ? "已封存" : "封存教材"}
                </button>
              </div>
              {lesson.latestSyncError && (
                <p className="mt-4 rounded-xl bg-[var(--danger-soft)] p-3 text-xs leading-6 text-[var(--danger)]">
                  {lesson.latestSyncError}
                </p>
              )}
              <dl className="mt-4 grid gap-2 text-[11px] text-[var(--muted)]">
                <div><dt className="font-bold text-[var(--text)]">GitHub path</dt><dd className="break-all">{lesson.githubPath ?? "尚未同步"}</dd></div>
                <div><dt className="font-bold text-[var(--text)]">Blob SHA</dt><dd className="break-all font-mono">{lesson.githubBlobSha ?? "—"}</dd></div>
                <div><dt className="font-bold text-[var(--text)]">Commit SHA</dt><dd className="break-all font-mono">{lesson.githubCommitSha ?? "—"}</dd></div>
                <div><dt className="font-bold text-[var(--text)]">上次同步</dt><dd>{formatDateTime(lesson.githubLastSyncedAt)}</dd></div>
              </dl>
            </section>

            <section className="surface-card p-5">
              <div className="section-heading-row">
                <h2 className="section-heading">本機版本</h2>
                <span className="text-[11px] text-[var(--muted)]">{lesson.versions.length} 個</span>
              </div>
              <div className="admin-version-list">
                {lesson.versions.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setSelectedVersion(version)}
                    className={cn(
                      "admin-version-row",
                      selectedVersion?.id === version.id && "is-active",
                    )}
                  >
                    <span>
                      <strong>v{version.versionNumber}</strong>
                      <small>{version.versionStatus} · {formatDateTime(version.createdAt)}</small>
                    </span>
                    <GitCommitHorizontal size={15} />
                  </button>
                ))}
              </div>
              {lesson.githubPath && (
                <button
                  type="button"
                  className="secondary-button mt-4 w-full"
                  onClick={() => void loadRemoteHistory()}
                  disabled={busy === "history"}
                >
                  <GitCommitHorizontal size={16} />
                  讀取 GitHub Commit 歷史
                </button>
              )}
              {remoteHistory.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {remoteHistory.map((entry) => (
                    <div key={entry.sha} className="rounded-xl bg-[var(--surface-soft)] p-3 text-[11px]">
                      <strong className="block">{entry.message}</strong>
                      <span className="mt-1 block font-mono text-[var(--muted)]">{entry.sha.slice(0, 12)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        )}
      </div>

      {selectedVersion && (
        <section className="surface-card mt-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="page-kicker">Historical Version</p>
              <h2 className="mt-1 text-2xl font-extrabold">
                v{selectedVersion.versionNumber} · {selectedVersion.title}
              </h2>
            </div>
            <button type="button" className="secondary-button" onClick={() => setSelectedVersion(null)}>
              關閉版本
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {selectedVersion.versionStatus} · 建立於{" "}
            {formatDateTime(selectedVersion.createdAt)}
            {selectedVersion.githubCommitSha
              ? ` · commit ${selectedVersion.githubCommitSha.slice(0, 12)}`
              : ""}
          </p>
          <div className="mt-6">
            <LessonMarkdown content={selectedVersion.markdown} />
          </div>
        </section>
      )}
    </div>
  );
}
