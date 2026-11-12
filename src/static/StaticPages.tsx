import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  ExternalLink,
  Monitor,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState } from "../components/Feedback";
import { LessonCard } from "../components/LessonCard";
import { LessonDiagrams } from "../components/LessonDiagram";
import { LessonMarkdown } from "../components/LessonMarkdown";
import { cn } from "../lib/format";
import { formatDate } from "../lib/format";
import { extractToc } from "../lib/markdown";
import {
  getStaticLesson,
  searchStaticLessons,
  staticCategories,
  staticLessons,
  type StaticLesson,
} from "../lib/static-content";
import { useTheme } from "../lib/theme";
import type { LearningRecord, LessonSummary } from "../shared/types";

const repositoryUrl = "https://github.com/Timimt/cs-daily-knowledge-content";

function emptyRecord(lessonId: string): LearningRecord {
  return {
    lessonId,
    completed: false,
    bookmarked: false,
    lastReadAt: null,
    readCount: 0,
    quizScore: null,
    quizTotal: null,
    wrongAnswers: [],
    updatedAt: "",
  };
}

function toSummary(lesson: StaticLesson, snippet = lesson.summary): LessonSummary {
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
    record: emptyRecord(lesson.id),
  };
}

export function StaticDashboardPage() {
  const orderedLessons = [...staticLessons].sort((left, right) =>
    right.lessonDate.localeCompare(left.lessonDate),
  );
  const featured = orderedLessons[0];
  const latest = orderedLessons.slice(0, 3);
  const categories = staticCategories();

  return (
    <div className="page-container static-home">
      <header className="home-masthead">
        <p className="page-kicker">CS Notes · 資訊安全小知識</p>
        <div className="home-intro-grid">
          <h1 className="home-title">你好₍ᵔ･•･ᵔ₎。</h1>
          <div className="home-intro-copy">
            <p>
              這裡放一些平常無聊整理過的知識。
            </p>
            <Link to="/knowledge" className="editorial-text-link">
              瀏覽所有筆記
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
              <span>{featured.relatedTopics.slice(0, 2).join(" · ")}</span>
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
            <h2 id="latest-title">最新資安筆記</h2>
          </div>
          <Link to="/knowledge" className="editorial-text-link">
            瀏覽完整索引
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

      <section className="collection-scope" aria-labelledby="collection-scope-title">
        <div>
          <p className="section-index">02 / Scope</p>
          <h2 id="collection-scope-title">以資訊安全為核心，保留理解攻防所需的系統基礎。</h2>
        </div>
      </section>
    </div>
  );
}

export function StaticKnowledgePage() {
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

  return (
    <div className="page-container knowledge-page">
      <header className="knowledge-header">
        <div>
          <p className="page-kicker">Security knowledge index</p>
          <h1 className="page-title">資安筆記索引</h1>
          <p className="page-description">
            由我自行整理、持續修訂的資訊安全筆記。可依分類瀏覽，或直接搜尋技術名稱與關鍵概念。
          </p>
        </div>
        <div className="knowledge-count" aria-label={`共 ${staticLessons.length} 篇公開筆記`}>
          <strong>{String(staticLessons.length).padStart(2, "0")}</strong>
          <span>篇公開筆記</span>
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
          title="找不到相關筆記"
          message="試試更短的關鍵字、英文技術名稱，或清除分類篩選。"
          action={
            <button type="button" className="secondary-button" onClick={() => { setQuery(""); setCategory(""); }}>
              清除所有條件
            </button>
          }
        />
      ) : (
        <section className="lesson-grid editorial-lesson-grid" aria-label="資安筆記搜尋結果">
          {results.map(({ lesson, snippet }) => (
            <LessonCard
              key={lesson.id}
              lesson={toSummary(lesson, snippet)}
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
  const toc = useMemo(() => (lesson ? extractToc(lesson.markdown) : []), [lesson]);

  if (!lesson) {
    return (
      <div className="reading-container">
        <ErrorState
          title="找不到筆記"
          message="這篇筆記可能尚未發布，或已從 GitHub 移除。"
          action={<Link to="/knowledge" className="secondary-button">回到資安筆記</Link>}
        />
      </div>
    );
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
          回到資安筆記
        </Link>
        <span>Markdown 原文保存在 GitHub</span>
      </div>

      <div className="lesson-layout editorial-lesson-layout">
        <article className="min-w-0">
          <header className="lesson-header editorial-lesson-header">
            <div className="reader-kicker">
              <span>{lesson.id}</span>
              <span>{lesson.category}</span>
            </div>
            <h1>{lesson.title}</h1>
            <p className="lesson-summary">{lesson.summary}</p>
            <div className="reader-meta">
              <span><CalendarDays size={14} />整理於 {formatDate(lesson.lessonDate)}</span>
              <span><Clock3 size={14} />約 {lesson.estimatedMinutes} 分鐘</span>
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

            <nav className="lesson-pagination" aria-label="前後篇筆記">
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

export function StaticSettingsPage() {
  const { mode, setMode } = useTheme();

  return (
    <div className="page-container settings-page">
      <header className="standard-page-header">
        <p className="page-kicker">Site preferences</p>
        <h1 className="page-title">設定</h1>
        <p className="page-description">
          調整閱讀外觀，或查看這個網站的內容來源與公開方式。
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
              <h2 id="source-settings">內容來源</h2>
              <p>網站只負責呈現 GitHub 中的 Markdown 筆記。</p>
            </div>
          </header>
          <div className="settings-group-body">
            <div className="setting-row">
              <div className="setting-copy">
                <h3>GitHub · main</h3>
                <p>筆記由我整理後放入 Repository，不是每日自動生成的文章。</p>
              </div>
              <a href={repositoryUrl} target="_blank" rel="noreferrer noopener" className="secondary-button">
                <ExternalLink size={16} />
                查看 Repository
              </a>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-labelledby="site-settings">
          <header>
            <span>03</span>
            <div>
              <h2 id="site-settings">網站資訊</h2>
              <p>目前公開內容與建置狀態。</p>
            </div>
          </header>
          <div className="settings-group-body">
            <dl className="site-facts">
              <div><dt>公開筆記</dt><dd>{staticLessons.length} 篇</dd></div>
              <div><dt>內容來源</dt><dd>GitHub main</dd></div>
              <div><dt>網站形式</dt><dd>Static · GitHub Pages</dd></div>
              <div><dt>個人資料</dt><dd>不收集閱讀、收藏或測驗紀錄</dd></div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
