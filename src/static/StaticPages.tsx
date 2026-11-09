import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookCheck,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Flame,
  HardDrive,
  Library,
  Monitor,
  Moon,
  Search,
  Sun,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/Feedback";
import { LessonCard } from "../components/LessonCard";
import { LessonDiagrams } from "../components/LessonDiagram";
import { LessonMarkdown } from "../components/LessonMarkdown";
import { QuizPanel } from "../components/QuizPanel";
import { StatusButton } from "../components/StatusButton";
import { cn } from "../lib/format";
import { dayLabel, formatDate, formatDateTime } from "../lib/format";
import {
  defaultLocalRecord,
  exportLocalLearning,
  getLocalProgress,
  getLocalRecord,
  importLegacyLearning,
  markLocalLessonRead,
  saveLocalQuizSubmission,
  subscribeLocalLearning,
  updateLocalRecord,
} from "../lib/local-learning";
import { extractToc } from "../lib/markdown";
import {
  getStaticLesson,
  gradeStaticQuiz,
  searchStaticLessons,
  staticCategories,
  staticLessons,
  toPublicQuizQuestions,
  type StaticLesson,
} from "../lib/static-content";
import { useTheme } from "../lib/theme";
import type {
  LearningRecord,
  LessonSummary,
  QuizSubmission,
} from "../shared/types";

const repositoryUrl = "https://github.com/Timimt/cs-daily-knowledge-content";

function useLocalLearningSnapshot() {
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeLocalLearning(() => setRevision((value) => value + 1)), []);
  return revision;
}

function toSummary(lesson: StaticLesson, record: LearningRecord, snippet = lesson.summary): LessonSummary {
  return {
    id: lesson.id,
    day: lesson.day,
    title: lesson.title,
    category: lesson.category,
    date: lesson.lessonDate,
    summary: lesson.summary,
    snippet,
    estimatedMinutes: lesson.estimatedMinutes,
    tags: lesson.tags,
    imageCount: lesson.images.length,
    record,
  };
}

export function StaticDashboardPage() {
  useLocalLearningSnapshot();
  const today = staticLessons[0];
  const progress = getLocalProgress();
  const categories = staticCategories();
  const recent = staticLessons
    .map((lesson) => ({ lesson, record: getLocalRecord(lesson.id) }))
    .filter(({ record }) => record.lastReadAt)
    .sort((left, right) => (right.record.lastReadAt ?? "").localeCompare(left.record.lastReadAt ?? ""))
    .slice(0, 5);
  const completedPercent =
    progress.totalLessons === 0
      ? 0
      : Math.round((progress.completedCount / progress.totalLessons) * 100);

  return (
    <div className="page-container">
      <header className="mb-5">
        <p className="page-kicker">GitHub-driven CS Knowledge Base</p>
        <h1 className="page-title">每天讀一篇，慢慢累積真正有用的資工知識。</h1>
      </header>

      <section className="dashboard-hero" aria-labelledby="today-lesson-title">
        <div className="hero-content">
          <div className="hero-kicker">
            <span>{dayLabel(today.day)}</span>
            <span aria-hidden="true">·</span>
            <span>{today.category}</span>
          </div>
          <h2 id="today-lesson-title" className="hero-title">{today.title}</h2>
          <p className="hero-summary">{today.summary}</p>
          <div className="hero-actions">
            <Link to={`/lessons/${today.id}`} className="hero-primary">
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
              {formatDate(today.lessonDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen size={14} />
              預估 {today.estimatedMinutes} 分鐘
            </span>
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="學習統計">
        <article className="stat-card">
          <span className="stat-icon"><Flame size={18} /></span>
          <div className="stat-value">{progress.streak}</div>
          <p className="stat-label">連續學習天數</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><BookCheck size={18} /></span>
          <div className="stat-value">
            {progress.completedCount}
            <span className="text-sm font-medium text-[var(--muted)]"> / {progress.totalLessons}</span>
          </div>
          <p className="stat-label">已完成課程</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><Library size={18} /></span>
          <div className="stat-value">{categories.length}</div>
          <p className="stat-label">學習分類</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon"><BarChart3 size={18} /></span>
          <div className="stat-value">{completedPercent}%</div>
          <p className="stat-label">整體完成率</p>
        </article>
      </section>

      <div className="dashboard-columns mt-8">
        <section aria-labelledby="recent-title">
          <div className="section-heading-row">
            <h2 id="recent-title" className="section-heading">最近學習</h2>
            <Link to="/progress" className="section-link">查看全部 <ArrowRight size={14} /></Link>
          </div>
          {recent.length === 0 ? (
            <div className="surface-card px-5 py-8 text-center">
              <BookOpen className="mx-auto text-[var(--muted)]" size={25} />
              <p className="mt-3 text-sm font-semibold">還沒有閱讀紀錄</p>
              <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                打開任何教材後，進度會保存在此瀏覽器。
              </p>
            </div>
          ) : (
            <div className="recent-list">
              {recent.map(({ lesson, record }) => (
                <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="recent-row">
                  <span className="recent-day">D{String(lesson.day).padStart(3, "0")}</span>
                  <div className="min-w-0">
                    <h3>{lesson.title}</h3>
                    <p>{formatDateTime(record.lastReadAt)} · {record.completed ? "已完成" : "閱讀中"}</p>
                  </div>
                  <ArrowRight className="text-[var(--muted)]" size={16} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="surface-card p-5" aria-labelledby="category-title">
          <div className="section-heading-row">
            <h2 id="category-title" className="section-heading">分類分布</h2>
          </div>
          {categories.map((item) => (
            <div key={item.category} className="category-row">
              <div className="category-row-header">
                <span>{item.category}</span>
                <span className="text-[var(--muted)]">{item.count} 篇</span>
              </div>
              <div className="category-track">
                <div
                  className="category-fill"
                  style={{ width: `${Math.round((item.count / staticLessons.length) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export function StaticKnowledgePage() {
  const revision = useLocalLearningSnapshot();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQuery) next.set("q", debouncedQuery);
    if (category) next.set("category", category);
    setSearchParams(next, { replace: true });
  }, [category, debouncedQuery, setSearchParams]);

  const results = useMemo(
    () => searchStaticLessons(debouncedQuery, category),
    [debouncedQuery, category],
  );
  const categories = useMemo(staticCategories, []);
  const resultDescription = debouncedQuery
    ? `搜尋「${debouncedQuery}」`
    : category || "所有教材";

  function update(lessonId: string, kind: "completed" | "bookmarked", value: boolean) {
    updateLocalRecord(lessonId, { [kind]: value });
  }

  return (
    <div className="page-container">
      <header>
        <p className="page-kicker">Read-only GitHub Content</p>
        <h1 className="page-title">歷史知識庫</h1>
        <p className="page-description">
          教材直接來自 GitHub Repository。搜尋、收藏與完成狀態全部在瀏覽器執行。
        </p>
      </header>

      <section className="search-panel mt-6" aria-label="知識庫搜尋與篩選">
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
            <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="清除搜尋">
              <X size={17} />
            </button>
          )}
        </div>
        <div className="filter-strip" role="group" aria-label="依分類篩選">
          <button type="button" className={cn("filter-chip", !category && "is-active")} onClick={() => setCategory("")}>
            全部
          </button>
          {categories.map((item) => (
            <button
              type="button"
              key={item.category}
              className={cn("filter-chip", category === item.category && "is-active")}
              onClick={() => setCategory((current) => current === item.category ? "" : item.category)}
            >
              {item.category} · {item.count}
            </button>
          ))}
        </div>
      </section>

      <div className="mb-2 mt-6 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--muted)]">{resultDescription}</p>
        <p className="text-xs text-[var(--muted)]">{results.length} 篇</p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="找不到相關教材"
          message="試試更短的關鍵字、英文技術名稱，或清除分類篩選。"
          action={
            <button type="button" className="secondary-button" onClick={() => { setQuery(""); setCategory(""); }}>
              清除所有條件
            </button>
          }
        />
      ) : (
        <section className="lesson-grid" aria-label="教材搜尋結果">
          {results.map(({ lesson, snippet }) => (
            <LessonCard
              key={`${lesson.id}-${revision}`}
              lesson={toSummary(lesson, getLocalRecord(lesson.id), snippet)}
              onUpdate={(kind, value) => update(lesson.id, kind, value)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

export function StaticLessonPage() {
  const { id = "" } = useParams();
  const lesson = getStaticLesson(id);
  const revision = useLocalLearningSnapshot();
  const markedRead = useRef(false);
  const [record, setRecord] = useState<LearningRecord>(() => getLocalRecord(id));
  const [busy, setBusy] = useState<"completed" | "bookmarked" | null>(null);

  useEffect(() => {
    setRecord(getLocalRecord(id));
    markedRead.current = false;
  }, [id]);

  useEffect(() => {
    if (!lesson || markedRead.current) return;
    markedRead.current = true;
    setRecord(markLocalLessonRead(id));
  }, [id, lesson]);

  useEffect(() => {
    setRecord(getLocalRecord(id));
  }, [id, revision]);

  const toc = useMemo(() => (lesson ? extractToc(lesson.markdown) : []), [lesson]);

  if (!lesson) {
    return (
      <div className="reading-container">
        <ErrorState
          title="找不到教材"
          message="這篇教材可能尚未發布，或已從 GitHub 移除。"
          action={<Link to="/knowledge" className="secondary-button">回到知識庫</Link>}
        />
      </div>
    );
  }

  function toggle(kind: "completed" | "bookmarked") {
    if (busy) return;
    setBusy(kind);
    setRecord(updateLocalRecord(lesson!.id, { [kind]: !record[kind] }));
    setBusy(null);
  }

  async function submitAnswers(answers: Record<string, number>): Promise<QuizSubmission> {
    const submission = gradeStaticQuiz(lesson!, answers);
    saveLocalQuizSubmission(submission);
    setRecord(getLocalRecord(lesson!.id));
    return submission;
  }

  const tocContent = (
    <ul className="toc-list">
      {toc.map((heading) => (
        <li key={`${heading.id}-${heading.text}`} data-level={heading.level}>
          <a
            href={`#${heading.id}`}
            onClick={(event) => {
              event.preventDefault();
              document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {heading.text}
          </a>
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

      <div className="mt-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-xs leading-6 text-[var(--muted)]">
        此頁不連接 SQLite。收藏、完成與測驗紀錄保存在目前瀏覽器的 localStorage。
      </div>

      <div className="lesson-layout mt-5">
        <article className="min-w-0">
          <header className="lesson-header">
            <div className="flex flex-wrap items-center gap-2">
              <span className="meta-pill is-accent">{dayLabel(lesson.day)}</span>
              <span className="meta-pill">{lesson.category}</span>
              {record.completed && <span className="meta-pill is-success">已完成</span>}
            </div>
            <h1>{lesson.title}</h1>
            <p className="lesson-summary">{lesson.summary}</p>
            <div className="lesson-meta">
              <span className="meta-pill"><CalendarDays size={13} className="mr-1.5" />{formatDate(lesson.lessonDate)}</span>
              <span className="meta-pill"><Clock3 size={13} className="mr-1.5" />{lesson.estimatedMinutes} 分鐘</span>
              <span className="meta-pill"><BookOpen size={13} className="mr-1.5" />已閱讀 {record.readCount} 次</span>
              {record.quizTotal && (
                <span className="meta-pill is-success">最近測驗 {record.quizScore} / {record.quizTotal}</span>
              )}
            </div>
            <div className="lesson-actions">
              <StatusButton kind="completed" active={record.completed} busy={busy === "completed"} onToggle={() => toggle("completed")} />
              <StatusButton kind="bookmarked" active={record.bookmarked} busy={busy === "bookmarked"} onToggle={() => toggle("bookmarked")} />
            </div>
            {record.lastReadAt && (
              <p className="mt-3 text-[11px] text-[var(--muted)]">最近閱讀：{formatDateTime(record.lastReadAt)}</p>
            )}
          </header>

          <details className="mobile-toc mt-5">
            <summary>本文目錄 · {toc.length} 個章節</summary>
            <nav aria-label="手機版文章目錄">{tocContent}</nav>
          </details>

          <div className="article-panel">
            <LessonDiagrams images={lesson.images} />
            <LessonMarkdown content={lesson.markdown} />

            <section className="mt-10 border-t border-[var(--line)] pt-7">
              <div className="flex items-center gap-2">
                <Library size={18} className="text-[var(--accent-strong)]" />
                <h2 className="text-xl font-extrabold tracking-[-0.025em]">相關知識節點</h2>
              </div>
              <div className="related-topics">
                {lesson.relatedTopics.map((topic) => <span key={topic} className="meta-pill">{topic}</span>)}
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
                      <span className="mt-1 block text-[11px] text-[var(--muted)]">{reference.publisher}</span>
                    </span>
                    <ExternalLink size={16} className="shrink-0 text-[var(--muted)]" />
                  </a>
                ))}
              </div>
            </section>

            <QuizPanel
              lessonId={lesson.id}
              questions={toPublicQuizQuestions(lesson)}
              onScored={(score, total) => setRecord((current) => ({ ...current, quizScore: score, quizTotal: total }))}
              submitAnswers={submitAnswers}
              answerSource="local"
            />

            <section className="mt-10 rounded-2xl border border-[color-mix(in_srgb,var(--success)_28%,var(--line))] bg-[var(--success-soft)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-extrabold">今天的內容讀完了嗎？</h2>
                  <p className="mt-1 text-xs leading-6 text-[var(--muted)]">完成狀態會保存在此瀏覽器。</p>
                </div>
                <button type="button" className="primary-button" onClick={() => toggle("completed")}>
                  <CheckCircle2 size={17} />
                  {record.completed ? "取消完成" : "完成本課"}
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

export function StaticProgressPage() {
  const revision = useLocalLearningSnapshot();
  const data = getLocalProgress();
  const readCount = data.records.filter((entry) => entry.lastReadAt).length;
  const wrongCount = data.records.reduce((sum, entry) => sum + entry.wrongAnswers.length, 0);

  return (
    <div className="page-container" data-revision={revision}>
      <header>
        <p className="page-kicker">Browser Learning Record</p>
        <h1 className="page-title">學習紀錄</h1>
        <p className="page-description">
          這些資料目前在這個瀏覽器內；之後才會加入跨裝置雲端同步。
        </p>
      </header>

      <section className="progress-grid" aria-label="學習進度統計">
        <article className="stat-card"><span className="stat-icon"><Flame size={18} /></span><div className="stat-value">{data.streak}</div><p className="stat-label">連續學習天數</p></article>
        <article className="stat-card"><span className="stat-icon"><BookCheck size={18} /></span><div className="stat-value">{data.completedCount}<span className="text-sm font-medium text-[var(--muted)]"> / {data.totalLessons}</span></div><p className="stat-label">完成課程</p></article>
        <article className="stat-card"><span className="stat-icon"><BarChart3 size={18} /></span><div className="stat-value">{readCount}</div><p className="stat-label">曾閱讀教材</p></article>
        <article className="stat-card"><span className="stat-icon"><BrainCircuit size={18} /></span><div className="stat-value">{data.averageQuizPercent === null ? "—" : `${data.averageQuizPercent}%`}</div><p className="stat-label">最近測驗平均</p></article>
      </section>

      <div className="mt-9 grid gap-8 lg:grid-cols-[1.35fr_0.85fr]">
        <section aria-labelledby="progress-lessons-title">
          <div className="section-heading-row">
            <h2 id="progress-lessons-title" className="section-heading">教材進度</h2>
            <span className="text-[11px] text-[var(--muted)]">{wrongCount} 個最近錯題</span>
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
                      {lesson.record.quizTotal ? ` · 測驗 ${lesson.record.quizScore} / ${lesson.record.quizTotal}` : " · 尚未作答"}
                    </p>
                  </div>
                  <Link to={`/lessons/${lesson.id}`} className="touch-target inline-flex shrink-0 items-center justify-center rounded-xl text-[var(--accent-strong)]" aria-label={`繼續閱讀 ${lesson.title}`}>
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
            <h2 id="attempts-title" className="section-heading">測驗嘗試</h2>
          </div>
          {data.attempts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line-strong)] p-5 text-center">
              <BrainCircuit className="mx-auto text-[var(--muted)]" size={23} />
              <p className="mt-3 text-sm font-semibold">還沒有測驗紀錄</p>
            </div>
          ) : (
            data.attempts.map((attempt) => (
              <div key={attempt.id} className="attempt-row">
                <Link to={`/lessons/${attempt.lessonId}`} className="min-w-0 flex-1 font-semibold hover:text-[var(--accent-strong)]">
                  <span className="block truncate">{attempt.lessonTitle}</span>
                  <span className="mt-1 block text-[10px] font-normal text-[var(--muted)]">{formatDateTime(attempt.attemptedAt)}</span>
                </Link>
                <span className="meta-pill is-accent">{attempt.score} / {attempt.total}</span>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export function StaticSettingsPage() {
  const { mode, setMode } = useTheme();
  useLocalLearningSnapshot();
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const snapshot = exportLocalLearning();

  function downloadCurrentData() {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cs-daily-learning-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const result = importLegacyLearning(parsed);
      setMessage(`已匯入 ${result.importedRecords} 筆學習紀錄與 ${result.importedAttempts} 筆測驗紀錄。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "匯入失敗。");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="page-container">
      <header>
        <p className="page-kicker">Static Site Settings</p>
        <h1 className="page-title">設定</h1>
        <p className="page-description">教材唯讀；個人學習資料只存在這個瀏覽器。</p>
      </header>

      <div className="settings-grid">
        <section className="settings-card surface-card">
          <div className="flex items-center gap-2">
            <Monitor size={18} className="text-[var(--accent-strong)]" />
            <h2>顯示主題</h2>
          </div>
          <div className="theme-options">
            {[
              { value: "light" as const, label: "淺色", icon: Sun },
              { value: "dark" as const, label: "深色", icon: Moon },
              { value: "system" as const, label: "跟隨系統", icon: Monitor },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.value} type="button" className={cn("theme-option", mode === item.value && "is-active")} onClick={() => setMode(item.value)}>
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings-card surface-card">
          <div className="flex items-center gap-2">
            <Library size={18} className="text-[var(--accent-strong)]" />
            <h2>GitHub 教材來源</h2>
          </div>
          <p>公開網站由 <strong>main</strong> 分支建置，教材 Markdown 與 metadata 是同一個 Repository 的權威來源。</p>
          <a href={repositoryUrl} target="_blank" rel="noreferrer noopener" className="secondary-button mt-4">
            <ExternalLink size={16} />
            開啟 Repository
          </a>
        </section>

        <section className="settings-card surface-card">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-[var(--accent-strong)]" />
            <h2>本機學習資料</h2>
          </div>
          <p>目前有 {snapshot.records.filter((record) => record.lastReadAt || record.completed || record.bookmarked).length} 筆學習紀錄與 {snapshot.attempts.length} 筆測驗紀錄。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="secondary-button" onClick={downloadCurrentData}>
              <Download size={16} />
              匯出 JSON
            </button>
            <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()}>
              <Upload size={16} />
              匯入舊 SQLite 備份
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importFile(event)} />
          </div>
          {message && <p className="mt-4 rounded-xl bg-[var(--surface-soft)] px-3 py-2 text-xs leading-6">{message}</p>}
        </section>

        <section className="settings-card surface-card">
          <div className="flex items-center gap-2">
            <BookCheck size={18} className="text-[var(--accent-strong)]" />
            <h2>資料範圍</h2>
          </div>
          <p>目前包含 {staticLessons.length} 篇已發布教材。Draft 不會被納入公開建置，也不會出現在搜尋或路由中。</p>
        </section>
      </div>
    </div>
  );
}
