import { Braces } from "lucide-react";

export function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <Braces size={19} strokeWidth={2.3} />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong className="brand-title">CS Notes</strong>
          <span className="brand-subtitle">宇奕整理的教材</span>
        </span>
      )}
    </div>
  );
}
