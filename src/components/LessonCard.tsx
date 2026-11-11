import { ArrowUpRight, BookOpen, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/format";
import type { LessonSummary } from "../shared/types";
import { formatDate } from "../lib/format";
import { StatusButton } from "./StatusButton";

type LessonCardProps = {
  lesson: LessonSummary;
  onUpdate?: (kind: "completed" | "bookmarked", value: boolean) => void;
  busyKind?: "completed" | "bookmarked" | null;
  variant?: "default" | "editorial";
};

export function LessonCard({
  lesson,
  onUpdate,
  busyKind = null,
  variant = "default",
}: LessonCardProps) {
  return (
    <article className={cn("lesson-card", variant === "editorial" && "is-editorial")}>
      <div className="lesson-card-eyebrow">
        <span className="lesson-card-code">{lesson.id}</span>
        <span>{lesson.category}</span>
        {lesson.record.completed && <span className="lesson-card-state">已完成</span>}
      </div>
      <Link to={`/lessons/${lesson.id}`} className="lesson-card-link">
        <h2 className="lesson-card-title">
          <span>{lesson.title}</span>
          <ArrowUpRight
            size={17}
            className="lesson-card-arrow"
          />
        </h2>
        <p className="lesson-card-snippet">
          {lesson.snippet}
        </p>
      </Link>
      <div className="lesson-card-footer">
        <div className="lesson-card-meta">
          <span>
            <BookOpen size={14} />
            {formatDate(lesson.date)}
          </span>
          <span>
            <Clock3 size={14} />
            {lesson.estimatedMinutes} 分鐘
          </span>
        </div>
        {onUpdate && (
          <div className="lesson-card-actions">
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
