# CS Notes

宇奕整理的資工與資安教材。公開網站由 GitHub Pages 託管，教材 Markdown 與 metadata 以 GitHub `main` 為唯一權威來源；收藏、完成、閱讀與測驗紀錄只保存在瀏覽器 `localStorage`。

目前只保留最初整理的三篇教材，不再每日自動生成文章。

原本的 Express + SQLite 管理與同步功能仍保留，作為本機管理、舊資料保存與後續雲端同步的基礎，但 GitHub Pages 公開網站不依賴後端或資料庫。

公開靜態網站不使用 AI 生成教材，也不包含自動排程產文。

## 技術

- React 19 + Vite 8 + TypeScript
- GitHub Pages 靜態建置與 HashRouter
- Build-time 教材 validation 與公開資料生成
- Tailwind CSS 4
- Node.js + Express API
- SQLite + Drizzle ORM
- scrypt 單人登入、資料庫 Session 與 CSRF
- Lesson Draft / Published / Archived 生命週期
- GitHub 同步 outbox 與 SHA 衝突保護
- React Router
- React Markdown、remark-gfm、KaTeX、highlight.js
- Playwright + Vitest

SQLite 檔案位於 `data/cs-daily.db`。第一次啟動會自動建立 schema 並匯入三篇教材；後續啟動只補缺少的教材，不會覆蓋既有學習紀錄。

## 本機啟動

需求：

- Node.js 22 以上
- pnpm 11 以上
- Edge 或 Chromium（只有執行端到端測試時需要）

```bash
pnpm install
pnpm dev
```

開啟 `http://localhost:5173`。

不需要環境變數即可執行 Phase 1。若要自訂資料庫位置，可建立 `.env` 並設定：

```env
PORT=3001
DATABASE_PATH=./data/cs-daily.db
```

啟動腳本會自動載入 `.env`（若存在）；Phase 1 不包含任何 API Key。

`pnpm dev` 會啟動 Vite 的前端熱更新與 Node API。修改 `src/server/` 後請重新執行 `pnpm dev`，讓 API bundle 重新建立。

## 常用指令

```bash
pnpm dev          # 同時啟動 API 與 Vite
pnpm db:init      # 建立資料表並補入 seed 教材
pnpm typecheck    # TypeScript 檢查
pnpm test         # Vitest 單元測試
pnpm content:build       # 從 GitHub 教材格式生成公開教材資料
pnpm build:pages         # 建置可直接部署 GitHub Pages 的靜態網站
pnpm legacy:export-learning # 唯讀匯出 SQLite 學習紀錄
pnpm test:e2e     # Playwright 端到端測試
pnpm build        # 建置前端並打包 API
pnpm start        # 以 production build 啟動，預設 3001 埠
```

`pnpm start` 前必須先執行 `pnpm build`，如此 Express 才能提供 `dist/` 靜態網站。

## GitHub Pages 靜態網站

GitHub Pages 版本使用：

```text
lessons/<category>/<lesson-id>.md
lessons/<category>/<lesson-id>.json
```

Markdown 保存文章內文；同名 JSON 保存標題、分類、日期、摘要、圖片、參考資料與測驗。只有 `status: "published"` 的教材會進入公開 bundle，Draft 不會被搜尋、建立路由或打包進 JavaScript。

本機驗證：

```powershell
pnpm.cmd build:pages
```

建置結果位於 `dist/`，資源 base path 預設為 `/cs-daily-knowledge-content/`。`.github/workflows/pages.yml` 會在 `main` 更新後建置並部署 GitHub Pages。

公開網站：

```text
https://timimt.github.io/cs-daily-knowledge-content/
```

GitHub Pages 進度保存在瀏覽器。舊 SQLite 學習紀錄可先執行 `pnpm.cmd legacy:export-learning` 匯出私有 JSON，再從靜態網站的「設定 → 匯入舊 SQLite 備份」載入；輸出的私有 JSON 不會提交到 Git。

## 單人登入設定

教材管理與所有會修改資料的 API 都需要登入。系統沒有預設密碼，也不會使用 GitHub Token 作為網站密碼。

在互動式終端機執行：

```bash
pnpm.cmd auth:secret
pnpm.cmd auth:hash
```

第一個指令產生 `AUTH_SESSION_SECRET`。第二個指令會隱藏密碼輸入，要求完整輸入兩次；兩次內容必須完全一致（包含空白）才會產生 `AUTH_PASSWORD_HASH`，不一致時不會建立 Hash。將兩個輸出寫入 `.env`：

```env
AUTH_PASSWORD_HASH=
AUTH_SESSION_SECRET=
AUTH_SESSION_TTL_HOURS=168
AUTH_COOKIE_SECURE=false
```

本機 HTTP 開發時 `AUTH_COOKIE_SECURE=false`；正式 HTTPS 環境必須使用 `true`。不要把真實值貼到聊天、README、Issue 或 Git。

寫入 `.env` 後，可在專案根目錄執行 `pnpm.cmd auth:verify`。指令會隱藏密碼輸入，直接使用 `.env` 的 `AUTH_PASSWORD_HASH` 與正式登入相同的驗證函式比對，不會呼叫登入 API、修改 SQLite 或累積登入失敗次數；結果只會是 `MATCH` 或 `MISMATCH`。

登入頁：`http://localhost:5173/admin/login`

教材管理：`http://localhost:5173/admin`

登入功能未設定時，公開閱讀仍可使用，但收藏、完成、測驗、學習紀錄與教材管理會安全地回傳未設定或未登入錯誤。

## 功能驗收

### 搜尋

在知識庫輸入 `RSA`、`AES`、`Windows API` 或 `勒索病毒`。搜尋範圍包含標題、內文、分類與標籤；無結果時會顯示明確提示。

### 收藏與完成

可從知識庫卡片或教材頁切換收藏與完成。狀態寫入 SQLite，重新整理或重啟 API 後仍保留。

### 測驗

每篇教材有三道單選題。作答前的 `/api/lessons/:id` 回應不包含 `correctOption` 或 `explanation`；提交 `/api/lessons/:id/quiz-attempts` 後才回傳批改結果與解析。

### AI 示範

AI 頁面可預覽三種回答模式：

- `grounded`
- `insufficient_evidence`
- `general_extension`

頁面會持續顯示「示範資料，尚未連接 DeepSeek API」。對話不會保存，重新整理後即清除。

## 主要 API

| Method | Endpoint | 用途 |
|---|---|---|
| GET | `/api/health` | 健康檢查 |
| GET | `/api/dashboard` | 首頁統計、今日教材、分類與最近閱讀 |
| GET | `/api/lessons?q=&category=` | 教材列表與關鍵字搜尋 |
| GET | `/api/lessons/:id` | 教材詳細內容與不含答案的測驗題 |
| POST | `/api/lessons/:id/read` | 更新最近閱讀時間與次數 |
| PATCH | `/api/lessons/:id/record` | 更新收藏或完成 |
| POST | `/api/lessons/:id/quiz-attempts` | 批改、保存測驗與錯題 |
| GET | `/api/progress` | 學習紀錄與最近測驗嘗試 |

## 專案結構

```text
content/lessons/                 三篇 Markdown 教材
data/                            SQLite 永久資料
scripts/                         Node API 建置與啟動工具
src/
  components/                    共用 UI、Markdown、圖解、測驗
  pages/                         六個主要頁面
  server/
    db/                          Drizzle schema、migration、seed
    lib/                         搜尋摘要與連續天數
    services/                    教材、紀錄與測驗服務
    index.ts                     Express API
  shared/                        API DTO
  styles.css                     Mobile First 設計系統
tests/
  unit/                          摘要與 streak 測試
  e2e/                           Edge 端到端測試
```

## Phase 2 準備

Phase 2 需要：

1. DeepSeek Platform 帳號與 API Key。
2. 僅放在伺服器環境變數的 `DEEPSEEK_API_KEY`。
3. 建議模型設定：

```env
DEEPSEEK_CHAT_MODEL=deepseek-flash
DEEPSEEK_LESSON_MODEL=deepseek-v4-pro
```

4. 以 OpenAI-compatible SDK 或 HTTP client 實作 `LlmProvider`。
5. 建立教材 chunks、關鍵字檢索與來源白名單。
6. 在模型呼叫前限制證據、對話摘要與輸出 tokens。
7. 將 `/api/ask` 保持為伺服器端端點，前端永遠不接觸 API Key。

Phase 2 仍不應把全部歷史文章塞進每次請求。應先檢索少量相關段落，再由後端驗證引用來源。

## GitHub 教材儲存服務

`GitHubContentService` 位於 `src/server/services/github-content/`。教材生命週期與同步流程由 `src/server/content/management-service.ts` 管理，再透過受登入與 CSRF 保護的 `/api/admin/lessons` 路由呼叫。

它支援：

- 建立 Markdown 教材
- 依教材 ID 或固定 path 讀取教材
- 使用目前檔案 SHA 安全更新教材
- 讀取指定檔案的 commit 歷史
- 讀取指定 commit 的舊版教材
- 明確拒絕實際刪除

教材路徑固定為：

```text
lessons/<category>/<lesson-id>.md
```

允許的分類包含：

```text
cybersecurity
operating-systems
networking
hardware
programming
algorithms
databases
ai-cloud
```

服務會拒絕路徑穿越、非 `.md` 檔案、未知分類、不合法的 lesson ID 與過大的 Markdown。

### 環境變數

只設定於伺服器端 `.env` 或部署平台環境變數：

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=
```

`GITHUB_TOKEN` 只可存取指定 Repository，並使用最小必要的 Contents 權限。不要建立 `VITE_GITHUB_*` 變數，也不要將 Token 傳到 React 或 GitHub Pages bundle。

### 程式使用方式

```ts
import { GitHubContentService } from "./src/server/services/github-content";

const contentService = GitHubContentService.fromEnv();

const result = await contentService.createLesson({
  lessonId: "day-004",
  category: "cybersecurity",
  title: "木馬程式基礎",
  markdown: "# 木馬程式基礎\n\n教材內容……",
});
```

GitHub 寫入預設停用。只有明確設定以下變數後，手動按下「同步至 GitHub」才會呼叫真實 API：

```env
GITHUB_SYNC_ENABLED=false
```

網站啟動、migration、教材讀取與發布流程都不會自動呼叫 GitHub。

## 教材生命週期

- 新教材建立為 `draft`
- 草稿可編輯、預覽與手動發布
- 發布後修改會建立新工作版本，但公開頁面仍顯示上一個已發布版本
- `published_version_id` 控制公開內容
- 封存後不再出現在公開知識庫，但 SQLite 版本、學習紀錄與 GitHub 不會刪除
- GitHub `local_only / pending / in_progress / synced / failed / conflict` 與 publication status 分開保存
- 同步工作使用 idempotency key、attempt count 與 pending outbox 記錄
- SHA 衝突不會強制覆蓋
- GitHub 成功但 SQLite 失敗時，會寫入 `data/github-sync-recovery/`

Phase 2 migration 與復原方式見 `docs/PHASE2_DATABASE_RECOVERY.md`。

### 測試

```bash
pnpm test:github-content
```

測試使用記憶體中的 mock GitHub API，不需要 Token，也不會發出真實網路請求。Private Repository 建立並提供 Token 後，才應另外執行真實 API 驗證。

## 目前限制

- 沒有 DeepSeek、RAG、Telegram 或每日 AI 生成。
- 只有單人帳號，沒有多使用者或 RBAC。
- GitHub 真實建立、更新、歷史與 SHA 驗證已完成；公開 Pages 不呼叫 GitHub 寫入 API。
- 教材管理尚未提供圖片上傳與測驗題目編輯。
- GitHub Pages 使用瀏覽器內關鍵字搜尋，教材由宇奕手動整理與更新。
- Pages 的收藏、進度與測驗紀錄保存在 localStorage；SQLite 是本機管理模式與遷移來源。
- GitHub remote commit 歷史需在同步啟用且使用者主動操作時才會查詢。
