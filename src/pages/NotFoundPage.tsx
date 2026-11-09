import { ArrowLeft, FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page-container">
      <div className="state-panel min-h-[60dvh]">
        <FileQuestion size={34} className="text-[var(--accent)]" />
        <div>
          <h2>找不到這個頁面</h2>
          <p>網址可能輸入錯誤，或這個教材尚未建立。</p>
        </div>
        <Link to="/" className="primary-button">
          <ArrowLeft size={16} />
          回到首頁
        </Link>
      </div>
    </div>
  );
}
