import { CheckCircle2, LoaderCircle, Star } from "lucide-react";
import { cn } from "../lib/format";

type StatusButtonProps = {
  kind: "completed" | "bookmarked";
  active: boolean;
  busy?: boolean;
  onToggle: () => void;
  iconOnly?: boolean;
};

export function StatusButton({
  kind,
  active,
  busy = false,
  onToggle,
  iconOnly = false,
}: StatusButtonProps) {
  const isCompleted = kind === "completed";
  const label = isCompleted ? (active ? "已完成" : "標記完成") : active ? "已收藏" : "收藏";
  const Icon = busy ? LoaderCircle : isCompleted ? CheckCircle2 : Star;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "status-button touch-target",
        active && "is-active",
        busy && "is-busy",
        iconOnly && "is-icon-only",
      )}
    >
      <Icon size={17} className={busy ? "animate-spin" : undefined} />
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}
