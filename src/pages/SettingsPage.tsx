import { useEffect, useState } from "react";
import {
  Database,
  FilePenLine,
  HardDrive,
  KeyRound,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useTheme } from "../lib/theme";
import { cn } from "../lib/format";

type HealthResponse = {
  ok: boolean;
  phase: string;
  ai: string;
};

export function SettingsPage() {
  const { mode, setMode } = useTheme();
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    apiFetch<HealthResponse>("/api/health").then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div className="page-container">
      <header>
        <p className="page-kicker">Settings</p>
        <h1 className="page-title">設定</h1>
        <p className="page-description">
          Phase 1 是單人、本機優先模式。這裡只保存主題偏好；教材與學習狀態仍以 SQLite 為準。
        </p>
      </header>

      <div className="settings-grid">
        <section className="settings-card surface-card">
          <div className="flex items-center gap-2">
            <FilePenLine size={18} className="text-[var(--accent-strong)]" />
            <h2>教材管理</h2>
          </div>
          <p>
            建立 Draft、預覽 Markdown、手動發布、封存、查看本機版本，以及獨立執行 GitHub 同步。
          </p>
          <Link to="/admin" className="primary-button mt-4">
            前往教材管理
          </Link>
        </section>

        <section className="settings-card surface-card">
          <div className="flex items-center gap-2">
            <Monitor size={18} className="text-[var(--accent-strong)]" />
            <h2>顯示主題</h2>
          </div>
          <p>可手動切換深淺色，也可以跟隨 Windows 或 Android 的系統設定。</p>
          <div className="theme-options">
            {[
              { value: "light" as const, label: "淺色", icon: Sun },
              { value: "dark" as const, label: "深色", icon: Moon },
              { value: "system" as const, label: "跟隨系統", icon: Monitor },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={cn("theme-option", mode === item.value && "is-active")}
                  onClick={() => setMode(item.value)}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings-card surface-card">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-[var(--accent-strong)]" />
            <h2>資料庫狀態</h2>
          </div>
          <p>
            教材、收藏、完成、閱讀時間、測驗分數與錯題都存在專案內的本機資料庫。
          </p>
          <span className="settings-value">data/cs-daily.db</span>
          <p className="mt-3">
            API 狀態：
            <strong className={health?.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}>
              {health?.ok ? " 正常" : " 無法確認"}
            </strong>
          </p>
        </section>

        <section className="settings-card surface-card">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-[var(--accent-strong)]" />
            <h2>AI 服務</h2>
          </div>
          <p>
            Phase 1 沒有 DeepSeek API Key，也不會從瀏覽器呼叫外部 AI。AI 搜尋頁只顯示有明確標示的模擬內容。
          </p>
          <span className="meta-pill is-demo mt-3">Demo only</span>
        </section>

        <section className="settings-card surface-card">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-[var(--accent-strong)]" />
            <h2>備份提醒</h2>
          </div>
          <p>
            關閉或重啟開發伺服器不會刪除資料。若要在另一台電腦使用，請複製整個 `data/` 資料夾；Phase 1 尚未提供雲端同步。
          </p>
        </section>
      </div>
    </div>
  );
}
