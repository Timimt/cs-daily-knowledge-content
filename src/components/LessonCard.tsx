import { ArrowUpRight, BookOpen, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import type { LessonSummary } from "../shared/types";
import { formatDate } from "../lib/format";
import { StatusButton } from "./StatusButton";

type LessonCardProps = {
  lesson: LessonSummary;
  onUpdate?: (kind: "completed" | "bookmarked", value: boolean) => void;
  busyKind?: "completed" | "bookmarked" | null;
};

export function LessonCard({ lesson, onUpdate, busyKind = null }: LessonCardProps) {
  return (
    <article className="lesson-card">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className="meta-pill is-accent">{lesson.id}</span>
        <span className="meta-pill">{lesson.category}</span>
        {lesson.record.completed && <span className="meta-pill is-success">已完成</span>}
      </div>
      <Link to={`/lessons/${lesson.id}`} className="group block">
        <h2 className="lesson-card-title">
          {lesson.title}
          <ArrowUpRight
            size={17}
            className="mt-1 shrink-0 text-[var(--muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--muted)]">
          {lesson.snippet}
        </p>
      </Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={14} />
            {formatDate(lesson.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 size={14} />
            {lesson.estimatedMinutes} 分鐘
          </span>
        </div>
        {onUpdate && (
          <div className="flex items-center gap-2">
            <StatusButton
              kind="bookmarked"
              active={lesson.record.bookmarked}
              busy={busyKind === "bookmarked"}
              onToggle={() => onUpdate("bookmarked", !lesson.record.bookmarked)}
              iconOnly
            />
            <StatusButton
              kind="completed"
              active={lesson.record.completed}
              busy={busyKind === "completed"}
              onToggle={() => onUpdate("completed", !lesson.record.completed)}
              iconOnly
            />
          </div>
        )}
      </div>
    </article>
  );
}
