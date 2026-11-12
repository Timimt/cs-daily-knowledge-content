# CS Notes

平常無聊時整理的資安小知識。公開網站由 GitHub Pages 託管，教材 Markdown 與 metadata 以 GitHub `main` 為來源。

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

## GitHub Pages 靜態網站

GitHub Pages 版本使用：

```text
lessons/<category>/<lesson-id>.md
lessons/<category>/<lesson-id>.json
```

Markdown 保存文章內文；同名 JSON 保存標題、分類、日期、摘要、圖片、參考資料與測驗。只有 `status: "published"` 的教材會進入公開 bundle，Draft 不會被搜尋、建立路由或打包進 JavaScript。

公開網站：

```text
https://timimt.github.io/cs-daily-knowledge-content/
```

GitHub Pages 進度保存在瀏覽器。


## 專案結構

```text
content/lessons/                 Markdown 教材
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
