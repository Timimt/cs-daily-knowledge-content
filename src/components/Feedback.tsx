import { AlertTriangle, LoaderCircle, SearchX } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({ label = "載入資料中…" }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <LoaderCircle className="animate-spin text-[var(--accent)]" size={28} />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "資料載入失敗",
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-panel border-[color-mix(in_srgb,var(--danger)_28%,transparent)]">
      <AlertTriangle className="text-[var(--danger)]" size={28} />
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-panel">
      <SearchX className="text-[var(--muted)]" size={28} />
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {action}
    </div>
  );
}
