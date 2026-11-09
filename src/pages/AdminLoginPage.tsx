import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { errorMessage } from "../lib/api";
import { LoadingState } from "../components/Feedback";

export function AdminLoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destination =
    (location.state as { from?: string } | null)?.from ?? "/admin";

  useEffect(() => {
    if (!auth.loading && auth.authenticated) {
      navigate(destination, { replace: true });
    }
  }, [auth.authenticated, auth.loading, destination, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await auth.login(password);
      setPassword("");
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (auth.loading) {
    return (
      <div className="page-container">
        <LoadingState />
      </div>
    );
  }

  if (!auth.configured) {
    return (
      <div className="page-container">
        <header>
          <p className="page-kicker">Protected Management</p>
          <h1 className="page-title">教材管理登入</h1>
        </header>
        <section className="surface-card mt-7 max-w-2xl p-6">
          <div className="flex items-center gap-2 text-[var(--gold)]">
            <KeyRound size={20} />
            <h2 className="text-lg font-extrabold">登入功能尚未設定</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            系統不會使用預設密碼。請先在本機安全設定以下環境變數：
          </p>
          <div className="mt-4 grid gap-2">
            {(auth.required.length > 0
              ? auth.required
              : ["AUTH_PASSWORD_HASH", "AUTH_SESSION_SECRET"]
            ).map((name) => (
              <code
                key={name}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs"
              >
                {name}
              </code>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-[var(--muted)]">
            使用 `node scripts/generate-auth-secret.mjs` 產生 Session Secret，並使用
            `node scripts/generate-password-hash.mjs` 在互動式終端機輸入密碼。
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="page-kicker">Protected Management</p>
          <h1 className="page-title">教材管理登入</h1>
          <p className="page-description">
            只有已驗證的單人帳號可以建立、編輯、發布或同步教材。一般閱讀頁仍可公開存取。
          </p>
          <div className="mt-6 flex items-start gap-3 text-xs leading-6 text-[var(--muted)]">
            <ShieldCheck className="mt-0.5 shrink-0 text-[var(--success)]" size={18} />
            Session Cookie 為 HttpOnly、SameSite=Strict；所有寫入請求都必須通過 CSRF 驗證。
          </div>
        </div>

        <form onSubmit={submit} className="surface-card p-6 sm:p-8">
          <div className="stat-icon">
            <LockKeyhole size={19} />
          </div>
          <h2 className="mt-5 text-xl font-extrabold">輸入管理密碼</h2>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
            密碼只會傳送至本站後端，並使用 scrypt 雜湊驗證。
          </p>
          <label htmlFor="admin-password" className="mt-6 block text-xs font-bold">
            密碼
          </label>
          <input
            id="admin-password"
            type="password"
            className="field-input mt-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
          />
          {error && (
            <p className="mt-4 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-xs leading-6 text-[var(--danger)]">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="primary-button mt-5 w-full"
            disabled={!password || submitting}
          >
            {submitting ? "驗證中…" : "登入"}
          </button>
        </form>
      </div>
    </div>
  );
}
