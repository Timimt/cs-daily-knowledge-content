import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CircleHelp,
  Database,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/format";

type DemoMode = "grounded" | "insufficient_evidence" | "general_extension";

type DemoMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  mode?: DemoMode;
  sources?: Array<{
    label: string;
    title: string;
    day: number;
    date: string;
    href: string;
  }>;
};

const modeLabels: Record<DemoMode, string> = {
  grounded: "grounded",
  insufficient_evidence: "insufficient_evidence",
  general_extension: "general_extension",
};

function createDemoAnswer(question: string, mode: DemoMode): DemoMessage {
  if (mode === "insufficient_evidence") {
    return {
      id: Date.now() + 1,
      role: "assistant",
      mode,
      content:
        "這是示範資料：目前模擬的歷史知識庫沒有足夠段落可以回答這個問題。\n\nPhase 2 接上檢索後，系統會先明確告知「歷史教材未涵蓋」，再讓你選擇是否使用一般知識補充；不會假裝這篇內容曾經出現在教材中。",
    };
  }

  if (mode === "general_extension") {
    return {
      id: Date.now() + 1,
      role: "assistant",
      mode,
      content:
        "這是示範資料：這一段會顯示模型延伸知識，而不是歷史教材引用。\n\n例如：較新的 TLS 版本可能使用不同金鑰交換與簽章組合；若涉及最新漏洞或產品狀態，回答仍必須提醒查核官方公告。Phase 1 不會真的呼叫 DeepSeek，也不會把這段示範內容保存成新教材。",
    };
  }

  return {
    id: Date.now() + 1,
    role: "assistant",
    mode,
    content: `這是示範資料，不是 DeepSeek 的真實回答。\n\n如果 Phase 2 檢索到 AES/RSA 教材，回答會根據少量相關段落組織內容，並用 [S1] 標記來源。以「${question}」為例，介面會先把歷史教材內容與模型補充明確分開，再附上可點擊的 Day、日期與段落位置。`,
    sources: [
      {
        label: "S1",
        title: "AES 與 RSA 的差異",
        day: 1,
        date: "2026-11-06",
        href: "/lessons/day-001",
      },
      {
        label: "S2",
        title: "勒索病毒的混合式加密流程",
        day: 3,
        date: "2026-11-08",
        href: "/lessons/day-003",
      },
    ],
  };
}

export function AiDemoPage() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<DemoMode>("grounded");
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "這是 Phase 1 的介面示範。你可以先測試提問流程、回答模式與來源卡片，但目前不會送出任何資料給 DeepSeek。",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  function submit() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setShowError(false);
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", content: trimmed },
    ]);
    setQuestion("");
    setLoading(true);
    timerRef.current = window.setTimeout(() => {
      setMessages((current) => [...current, createDemoAnswer(trimmed, mode)]);
      setLoading(false);
      timerRef.current = null;
    }, 750);
  }

  return (
    <div className="page-container">
      <header>
        <p className="page-kicker">Ask CS Knowledge</p>
        <h1 className="page-title">用自然語言找回學過的知識</h1>
        <p className="page-description">
          這個頁面先把 Phase 2 的問答、來源引用、錯誤處理與三種回答狀態做好。
        </p>
      </header>

      <div className="demo-notice" role="note">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          <strong>示範資料，尚未連接 DeepSeek API。</strong>{" "}
          Phase 1 不傳送問題到外部服務，也不會保存對話；重新整理後對話會清除。
        </p>
      </div>

      <div className="mode-selector" role="group" aria-label="預覽回答模式">
        {(Object.keys(modeLabels) as DemoMode[]).map((item) => (
          <button
            key={item}
            type="button"
            className={cn("mode-button", mode === item && "is-active")}
            onClick={() => setMode(item)}
          >
            {modeLabels[item]}
          </button>
        ))}
      </div>

      <div className="chat-panel">
        <div className="chat-messages" aria-live="polite">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "chat-message",
                message.role === "user" ? "is-user" : "is-assistant",
              )}
            >
              <div className="chat-role">
                {message.role === "user" ? <User size={13} /> : <Bot size={13} />}
                {message.role === "user" ? "你" : "CS Knowledge 示範介面"}
                {message.mode && (
                  <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[9px] text-[var(--accent-strong)]">
                    {message.mode}
                  </span>
                )}
              </div>
              <div className="chat-bubble">{message.content}</div>
              {message.sources && (
                <div className="source-cards">
                  {message.sources.map((source) => (
                    <Link key={source.label} to={source.href} className="source-card">
                      <span className="min-w-0">
                        <span className="font-bold text-[var(--accent-strong)]">
                          [{source.label}]
                        </span>{" "}
                        <span className="font-semibold">{source.title}</span>
                        <span className="mt-1 block text-[10px] text-[var(--muted)]">
                          DAY {String(source.day).padStart(3, "0")} · {source.date}
                        </span>
                      </span>
                      <ArrowUpRight size={15} className="shrink-0 text-[var(--muted)]" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-message is-assistant">
              <div className="chat-role">
                <Sparkles size={13} />
                示範介面
              </div>
              <div className="chat-bubble typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                正在產生示範回應
              </div>
            </div>
          )}

          {showError && (
            <div
              className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,var(--line))] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
              role="alert"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <strong className="block">API 錯誤區塊預覽</strong>
                <span className="mt-1 block text-xs leading-6 opacity-85">
                  Phase 2 若逾時、額度不足或模型錯誤，問題與已保存對話不會被誤刪，介面會提供重試。
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="ai-composer">
          <label htmlFor="ai-question" className="sr-only">
            輸入問題
          </label>
          <textarea
            id="ai-question"
            className="field-textarea"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="例如：AES 和 RSA 在混合式加密中怎麼分工？"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit();
            }}
          />
          <div className="composer-footer">
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <Database size={12} />
                歷史引用：預留
              </span>
              <button
                type="button"
                className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[var(--line)] px-2 text-[10px] text-[var(--muted)]"
                onClick={() => setShowError((current) => !current)}
              >
                <CircleHelp size={12} />
                預覽錯誤狀態
              </button>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={submit}
              disabled={!question.trim() || loading}
            >
              <Send size={16} />
              {loading ? "產生中…" : "送出問題"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
