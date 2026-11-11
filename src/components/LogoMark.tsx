import { Braces } from "lucide-react";

export function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="brand-mark" aria-hidden="true">
        <Braces size={19} strokeWidth={2.3} />
      </span>
      {!compact && (
        <span className="min-w-0">
          <strong className="block text-[15px] tracking-[-0.02em] text-[var(--text)]">
            CS Notes
          </strong>
          <span className="block text-[10px] font-semibold tracking-[0.08em] text-[var(--muted)]">
            宇奕整理的教材
          </span>
        </span>
      )}
    </div>
  );
}
