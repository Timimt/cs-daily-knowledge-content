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
import { formatDate, formatDateTime } from "../lib/format";
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
  const orderedLessons = [...staticLessons].sort((left, right) =>
    right.lessonDate.localeCompare(left.lessonDate),
  );
  const featured = orderedLessons[0];
  const latest = orderedLessons.slice(0, 3);
  const progress = getLocalProgress();
  const categories = staticCategories();
  const recent = staticLessons
    .map((lesson) => ({ lesson, record: getLocalRecord(lesson.id) }))
    .filter(({ record }) => record.lastReadAt)
    .sort((left, right) => (right.record.lastReadAt ?? "").localeCompare(left.record.lastReadAt ?? ""))
    .slice(0, 5);
  const readCount = progress.records.filter((entry) => entry.lastReadAt).length;

  return (
    <div className="page-container static-home">
      <header className="home-masthead">
        <p className="page-kicker">CS Notes · 資工與資安教材</p>
        <div className="home-intro-grid">
          <h1 className="home-title">把學過的東西，整理成能重讀的教材。</h1>
          <div className="home-intro-copy">
            <p>
              資訊安全、Windows 與程式基礎的個人筆記。教材保存在 GitHub，
              閱讀進度留在目前這台裝置。
            </p>
            <Link to="/knowledge" className="editorial-text-link">
              瀏覽全部教材
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <div className="home-feature-layout">
        <section className="featured-story" aria-labelledby="featured-lesson-title">
          <div className="featured-story-label">
            <span>Featured</span>
            <span>{featured.id}</span>
            <span>{featured.category}</span>
          </div>
          <h2 id="featured-lesson-title">{featured.title}</h2>
          <p className="featured-story-summary">{featured.summary}</p>
          <div className="featured-story-footer">
            <div className="featured-story-meta">
              <span>{formatDate(featured.lessonDate)}</span>
              <span>{featured.estimatedMinutes} 分鐘閱讀</span>
              <span>{featured.quiz.length} 題測驗</span>
            </div>
            <Link to={`/lessons/${featured.id}`} className="featured-story-link">
              開始閱讀
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>

        <aside className="knowledge-index" aria-labelledby="knowledge-index-title">
          <div className="knowledge-index-heading">
            <h2 id="knowledge-index-title">Knowledge index</h2>
            <span>{staticLessons.length} 篇</span>
          </div>
          <Link to="/knowledge" className="knowledge-index-row">
            <span>全部教材</span>
            <span>{staticLessons.length}</span>
          </Link>
          {categories.map((item) => (
            <Link
              key={item.category}
              to={`/knowledge?category=${encodeURIComponent(item.category)}`}
              className="knowledge-index-row"
            >
              <span>{item.category}</span>
              <span>{item.count}</span>
            </Link>
          ))}
        </aside>
      </div>

      <section className="latest-section" aria-labelledby="latest-title">
        <div className="editorial-section-heading">
          <div>
            <p className="section-index">01 / Recently organized</p>
            <h2 id="latest-title">最近整理</h2>
          </div>
          <Link to="/knowledge" className="editorial-text-link">
            完整索引
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="latest-lesson-list">
          {latest.map((lesson, index) => (
            <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="latest-lesson-row">
              <span className="latest-lesson-number">0{index + 1}</span>
              <span className="latest-lesson-copy">
                <span className="latest-lesson-meta">{lesson.id} · {lesson.category}</span>
                <strong>{lesson.title}</strong>
                <span>{lesson.summary}</span>
              </span>
              <span className="latest-lesson-date">
                {formatDate(lesson.lessonDate)}
                <ArrowUpRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="home-lower-grid">
        <section aria-labelledby="recent-title">
          <div className="editorial-section-heading is-compact">
            <div>
              <p className="section-index">02 / Reading trail</p>
              <h2 id="recent-title">最近的閱讀</h2>
            </div>
            <Link to="/progress" className="editorial-text-link">
              學習紀錄
              <ArrowRight size={15} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="inline-empty-state">
              <BookOpen size={20} />
              <div>
                <strong>還沒有閱讀紀錄</strong>
                <p>從一篇教材開始；進度只會留在這個瀏覽器。</p>
              </div>
            </div>
          ) : (
            <div className="reading-trail">
              {recent.map(({ lesson, record }, index) => (
                <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="reading-trail-row">
                  <span className="reading-trail-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="reading-trail-copy">
                    <strong>{lesson.title}</strong>
                    <span>{formatDateTime(record.lastReadAt)} · {record.completed ? "已完成" : "閱讀中"}</span>
                  </span>
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="study-summary" aria-labelledby="study-summary-title">
          <div className="editorial-section-heading is-compact">
            <div>
              <p className="section-index">At a glance</p>
              <h2 id="study-summary-title">學習概況</h2>
            </div>
          </div>
          <dl className="summary-metrics">
            <div><dt>曾閱讀</dt><dd>{readCount}<small>篇</small></dd></div>
            <div><dt>已完成</dt><dd>{progress.completedCount}<small>／{progress.totalLessons}</small></dd></div>
            <div><dt>連續學習</dt><dd>{progress.streak}<small>天</small></dd></div>
            <div><dt>測驗平均</dt><dd>{progress.averageQuizPercent === null ? "—" : `${progress.averageQuizPercent}%`}</dd></div>
          </dl>
          <p className="summary-footnote">
            <Flame size={14} />
            目前只計入此瀏覽器中的閱讀與作答資料。
          </p>
        </aside>
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
    <div className="page-container knowledge-page">
      <header className="knowledge-header">
        <div>
          <p className="page-kicker">Personal knowledge base</p>
          <h1 className="page-title">教材索引</h1>
          <p className="page-description">
            由我自行整理、持續修訂的資工筆記。可直接搜尋內容、標記收藏與完成狀態。
          </p>
        </div>
        <div className="knowledge-count" aria-label={`共 ${staticLessons.length} 篇公開教材`}>
          <strong>{String(staticLessons.length).padStart(2, "0")}</strong>
          <span>篇公開教材</span>
        </div>
      </header>

      <section className="knowledge-toolbar" aria-label="知識庫搜尋與篩選">
        <div className="knowledge-search">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="knowledge-search-input"
            placeholder="搜尋 AES、Windows API、勒索病毒…"
            aria-label="搜尋教材"
          />
          {query && (
            <button type="button" className="knowledge-search-clear" onClick={() => setQuery("")} aria-label="清除搜尋">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="category-tabs" role="group" aria-label="依分類篩選">
          <button
            type="button"
            className={cn("category-tab", !category && "is-active")}
            onClick={() => setCategory("")}
          >
            全部
            <span>{staticLessons.length}</span>
          </button>
          {categories.map((item) => (
            <button
              type="button"
              key={item.category}
              className={cn("category-tab", category === item.category && "is-active")}
              onClick={() => setCategory((current) => current === item.category ? "" : item.category)}
            >
              {item.category}
              <span>{item.count}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="knowledge-result-bar">
        <p>
          <span>{resultDescription}</span>
          {debouncedQuery && <button type="button" onClick={() => setQuery("")}>清除搜尋</button>}
        </p>
        <p>{results.length} 篇結果</p>
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
        <section className="lesson-grid editorial-lesson-grid" aria-label="教材搜尋結果">
          {results.map(({ lesson, snippet }) => (
            <LessonCard
              key={`${lesson.id}-${revision}`}
              lesson={toSummary(lesson, getLocalRecord(lesson.id), snippet)}
              onUpdate={(kind, value) => update(lesson.id, kind, value)}
              variant="editorial"
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

  const orderedLessons = [...staticLessons].sort((left, right) =>
    right.lessonDate.localeCompare(left.lessonDate),
  );
  const currentIndex = orderedLessons.findIndex((item) => item.id === lesson.id);
  const previousLesson = currentIndex >= 0 ? orderedLessons[currentIndex + 1] : undefined;
  const nextLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : undefined;

  return (
    <div className="reading-container static-reader">
      <div className="reader-utility-bar">
        <Link to="/knowledge" className="lesson-breadcrumb">
          <ArrowLeft size={15} />
          回到教材索引
        </Link>
        <span>收藏、進度與測驗只保存在目前裝置</span>
      </div>

      <div className="lesson-layout editorial-lesson-layout">
        <article className="min-w-0">
          <header className="lesson-header editorial-lesson-header">
            <div className="reader-kicker">
              <span>{lesson.id}</span>
              <span>{lesson.category}</span>
              {record.completed && <span>已完成</span>}
            </div>
            <h1>{lesson.title}</h1>
            <p className="lesson-summary">{lesson.summary}</p>
            <div className="reader-meta">
              <span><CalendarDays size={14} />整理於 {formatDate(lesson.lessonDate)}</span>
              <span><Clock3 size={14} />約 {lesson.estimatedMinutes} 分鐘</span>
              <span><BookOpen size={14} />讀過 {record.readCount} 次</span>
              {record.quizTotal && (
                <span>最近測驗 {record.quizScore} / {record.quizTotal}</span>
              )}
            </div>
            <div className="reader-action-row">
              <div className="lesson-actions">
                <StatusButton kind="completed" active={record.completed} busy={busy === "completed"} onToggle={() => toggle("completed")} />
                <StatusButton kind="bookmarked" active={record.bookmarked} busy={busy === "bookmarked"} onToggle={() => toggle("bookmarked")} />
              </div>
              {record.lastReadAt && (
                <p>上次閱讀 {formatDateTime(record.lastReadAt)}</p>
              )}
            </div>
          </header>

          <details className="mobile-toc">
            <summary>本文目錄 <span>{toc.length} 個章節</span></summary>
            <nav aria-label="手機版文章目錄">{tocContent}</nav>
          </details>

          <div className="article-panel">
            <LessonDiagrams images={lesson.images} />
            <LessonMarkdown content={lesson.markdown} />

            <section className="reader-section related-section">
              <p className="reader-section-index">Related topics</p>
              <h2>相關知識節點</h2>
              <div className="related-topics">
                {lesson.relatedTopics.map((topic) => <span key={topic}>{topic}</span>)}
              </div>
            </section>

            <section className="reader-section reference-section">
              <p className="reader-section-index">References</p>
              <h2>參考資料</h2>
              <div className="reference-list">
                {lesson.references.map((reference) => (
                  <a
                    key={reference.url}
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="reference-row"
                  >
                    <span>
                      <strong>{reference.title}</strong>
                      <span>{reference.publisher}</span>
                    </span>
                    <ExternalLink size={15} />
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

            <section className="reading-completion">
              <div>
                <p className="reader-section-index">End of note</p>
                <h2>{record.completed ? "這篇已經標記完成。" : "讀到這裡，替這篇筆記做個記號。"}</h2>
                <p>完成狀態只會保存在目前這個瀏覽器。</p>
              </div>
              <button type="button" className="primary-button" onClick={() => toggle("completed")}>
                <CheckCircle2 size={17} />
                {record.completed ? "取消完成" : "標記完成"}
              </button>
            </section>

            <nav className="lesson-pagination" aria-label="前後篇教材">
              {previousLesson ? (
                <Link to={`/lessons/${previousLesson.id}`} className="lesson-pagination-link">
                  <span>上一篇 · {previousLesson.id}</span>
                  <strong>{previousLesson.title}</strong>
                </Link>
              ) : <span />}
              {nextLesson ? (
                <Link to={`/lessons/${nextLesson.id}`} className="lesson-pagination-link is-next">
                  <span>下一篇 · {nextLesson.id}</span>
                  <strong>{nextLesson.title}</strong>
                </Link>
              ) : <span />}
            </nav>
          </div>
        </article>

        <aside className="toc-card static-toc" aria-label="文章目錄">
          <p>本文目錄</p>
          <h2>{lesson.id}</h2>
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
    <div className="page-container progress-page" data-revision={revision}>
      <header className="standard-page-header">
        <p className="page-kicker">Local learning record</p>
        <h1 className="page-title">學習紀錄</h1>
        <p className="page-description">
          整理目前裝置上的閱讀、收藏與測驗狀態。這些資料尚未跨裝置同步。
        </p>
      </header>

      <section className="learning-summary" aria-label="學習進度統計">
        <div><span>連續學習</span><strong>{data.streak}<small>天</small></strong></div>
        <div><span>完成教材</span><strong>{data.completedCount}<small>／{data.totalLessons}</small></strong></div>
        <div><span>曾閱讀</span><strong>{readCount}<small>篇</small></strong></div>
        <div><span>測驗平均</span><strong>{data.averageQuizPercent === null ? "—" : `${data.averageQuizPercent}%`}</strong></div>
      </section>

      <div className="progress-content-layout">
        <section aria-labelledby="progress-lessons-title">
          <div className="editorial-section-heading is-compact">
            <div>
              <p className="section-index">Lessons</p>
              <h2 id="progress-lessons-title">教材進度</h2>
            </div>
            <span className="section-counter">{wrongCount} 個待複習錯題</span>
          </div>
          <div className="record-list">
            {data.records.map(({ lesson, lastReadAt, wrongAnswers }) => (
              <article key={lesson.id} className="record-row">
                <div className="record-row-main">
                  <Link to={`/lessons/${lesson.id}`} className="record-row-title">
                    <span className="record-row-id">{lesson.id}</span>
                    <span>
                      <small>{lesson.category}</small>
                      <strong>{lesson.title}</strong>
                    </span>
                  </Link>
                  <div className="record-row-status">
                    {lesson.record.completed && <span className="is-complete">已完成</span>}
                    {lesson.record.bookmarked && <span>已收藏</span>}
                    {lesson.record.quizTotal ? <span>測驗 {lesson.record.quizScore} / {lesson.record.quizTotal}</span> : <span>尚未測驗</span>}
                  </div>
                  <div className="record-row-tail">
                    <span>最近閱讀</span>
                    <time>{formatDateTime(lastReadAt)}</time>
                    <Link to={`/lessons/${lesson.id}`} className="record-open-link" aria-label={`繼續閱讀 ${lesson.title}`}>
                      繼續閱讀
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>
                {wrongAnswers.length > 0 && (
                  <details className="record-wrong-answers">
                    <summary>查看最近錯題</summary>
                    <div className="wrong-answer-list">
                      {wrongAnswers.map((wrong) => (
                        <div key={wrong.questionId} className="wrong-answer">
                          {wrong.questionId} · 選擇選項 {wrong.selectedOption + 1}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="attempts-panel" aria-labelledby="attempts-title">
          <div className="editorial-section-heading is-compact">
            <div>
              <p className="section-index">Quiz attempts</p>
              <h2 id="attempts-title">測驗紀錄</h2>
            </div>
            <BrainCircuit size={18} />
          </div>
          {data.attempts.length === 0 ? (
            <div className="attempt-empty">
              <p>還沒有測驗紀錄。</p>
              <span>完成教材後，可以順便回答課後題目。</span>
            </div>
          ) : (
            <div className="attempt-list">
              {data.attempts.map((attempt) => (
                <Link key={attempt.id} to={`/lessons/${attempt.lessonId}`} className="attempt-row">
                  <span>
                    <strong>{attempt.lessonTitle}</strong>
                    <small>{formatDateTime(attempt.attemptedAt)}</small>
                  </span>
                  <span className="attempt-score">{attempt.score} / {attempt.total}</span>
                </Link>
              ))}
            </div>
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
    anchor.download = `cs-notes-learning-${new Date().toISOString().slice(0, 10)}.json`;
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
    <div className="page-container settings-page">
      <header className="standard-page-header">
        <p className="page-kicker">Preferences & data</p>
        <h1 className="page-title">設定</h1>
        <p className="page-description">
          調整閱讀外觀、查看教材來源，或管理目前瀏覽器中的個人學習資料。
        </p>
      </header>

      <div className="settings-sections">
        <section className="settings-group" aria-labelledby="appearance-settings">
          <header>
            <span>01</span>
            <div>
              <h2 id="appearance-settings">外觀</h2>
              <p>選擇閱讀時使用的色彩模式。</p>
            </div>
          </header>
          <div className="settings-group-body">
            <div className="setting-row">
              <div className="setting-copy">
                <h3>顯示模式</h3>
                <p>跟隨系統會依作業系統目前的深淺色設定切換。</p>
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
                      <Icon size={17} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-labelledby="source-settings">
          <header>
            <span>02</span>
            <div>
              <h2 id="source-settings">教材來源</h2>
              <p>網站只負責呈現 GitHub 中的 Markdown 教材。</p>
            </div>
          </header>
          <div className="settings-group-body">
            <div className="setting-row">
              <div className="setting-copy">
                <h3>GitHub · main</h3>
                <p>教材由我整理後放入 Repository，不是每日自動生成的文章。</p>
              </div>
              <a href={repositoryUrl} target="_blank" rel="noreferrer noopener" className="secondary-button">
                <ExternalLink size={16} />
                查看 Repository
              </a>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-labelledby="data-settings">
          <header>
            <span>03</span>
            <div>
              <h2 id="data-settings">本機資料</h2>
              <p>備份或帶入目前的學習紀錄。</p>
            </div>
          </header>
          <div className="settings-group-body">
            <div className="setting-row is-stacked">
              <div className="setting-copy">
                <h3>學習與測驗資料</h3>
                <p>
                  目前有 {snapshot.records.filter((record) => record.lastReadAt || record.completed || record.bookmarked).length} 筆學習紀錄與 {snapshot.attempts.length} 筆測驗紀錄。
                  匯入功能只會處理 JSON 備份，不會連線到正式資料庫。
                </p>
              </div>
              <div className="setting-actions">
                <button type="button" className="secondary-button" onClick={downloadCurrentData}>
                  <Download size={16} />
                  匯出 JSON
                </button>
                <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()}>
                  <Upload size={16} />
                  匯入舊備份
                </button>
                <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importFile(event)} />
              </div>
              {message && <p className="settings-message">{message}</p>}
            </div>
          </div>
        </section>

        <section className="settings-group" aria-labelledby="site-settings">
          <header>
            <span>04</span>
            <div>
              <h2 id="site-settings">網站資訊</h2>
              <p>目前公開內容與建置狀態。</p>
            </div>
          </header>
          <div className="settings-group-body">
            <dl className="site-facts">
              <div><dt>公開教材</dt><dd>{staticLessons.length} 篇</dd></div>
              <div><dt>教材來源</dt><dd>GitHub main</dd></div>
              <div><dt>網站形式</dt><dd>Static · GitHub Pages</dd></div>
              <div><dt>Draft</dt><dd>不納入公開建置、搜尋與路由</dd></div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
