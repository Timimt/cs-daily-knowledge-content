import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const E2E_PASSWORD = "Phase2-E2E-Password-2026!";

test.beforeEach(async ({ page }) => {
  const response = await page.request.post("/api/auth/login", {
    data: { password: E2E_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
});

async function expectNoBodyOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

test("dashboard exposes every primary entry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("今天");
  await expect(page.getByText("勒索病毒的混合式加密流程").first()).toBeVisible();
  await expectNoBodyOverflow(page);

  const mobileNav = page.getByRole("navigation", { name: "行動版主要導覽" });
  for (const label of ["知識庫", "AI 搜尋", "學習紀錄", "設定", "首頁"]) {
    await mobileNav.getByRole("link", { name: label }).click();
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toBeEmpty();
  }
});

test("lesson renders markdown, math, table, code, and inline SVG while hiding answers", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const response = await page.request.get("/api/lessons/day-001");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.quiz).toHaveLength(3);
  expect(payload.quiz[0]).not.toHaveProperty("correctOption");
  expect(payload.quiz[0]).not.toHaveProperty("explanation");

  for (const [lessonId, title] of [
    ["day-001", "AES 與 RSA 的差異"],
    ["day-002", "Windows Process 與 Windows API"],
    ["day-003", "勒索病毒的混合式加密流程"],
  ] as const) {
    await page.goto(`/lessons/${lessonId}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.locator(".lesson-prose table")).toBeVisible();
    await expect(page.locator(".lesson-prose pre code")).toBeVisible();
    await expect(page.locator("svg[role='img']").first()).toBeVisible();
  }

  await page.goto("/lessons/day-001");
  await expect(page.locator(".katex").first()).toBeVisible();
  await expect(page.getByText("AES 是對稱式加密。傳送端與接收端必須取得相同的秘密金鑰")).toHaveCount(0);
  await expectNoBodyOverflow(page);
  expect(consoleErrors).toEqual([]);
});

test("knowledge search and category filtering work", async ({ page }) => {
  await page.goto("/knowledge");
  const input = page.getByRole("searchbox", { name: "搜尋教材" });

  for (const [query, expectedTitle] of [
    ["RSA", "AES 與 RSA 的差異"],
    ["AES", "AES 與 RSA 的差異"],
    ["Windows API", "Windows Process 與 Windows API"],
    ["勒索病毒", "勒索病毒的混合式加密流程"],
  ] as const) {
    await input.fill(query);
    await expect(page.getByRole("link", { name: new RegExp(expectedTitle) })).toBeVisible();
  }

  await input.fill("不存在的量子披薩");
  await expect(page.getByText("找不到相關教材")).toBeVisible();
  await input.fill("");
  await page.getByRole("button", { name: /作業系統與 Windows/ }).click();
  await expect(page.getByText("Windows Process 與 Windows API").first()).toBeVisible();
  await expect(page.getByText("AES 與 RSA 的差異")).toHaveCount(0);
});

test("bookmark, completion, quiz score, and wrong answers persist after reload", async ({
  page,
}) => {
  await page.goto("/lessons/day-002");

  const bookmarkButton = page.getByRole("button", { name: /^(收藏|已收藏)$/ });
  const bookmarkWasActive = (await bookmarkButton.getAttribute("aria-pressed")) === "true";
  await bookmarkButton.click();
  await expect(
    page.getByRole("button", {
      name: bookmarkWasActive ? "收藏" : "已收藏",
    }),
  ).toBeVisible();
  const completeButton = page.getByRole("button", { name: /^(標記完成|已完成)$/ }).first();
  const completeWasActive = (await completeButton.getAttribute("aria-pressed")) === "true";
  await completeButton.click();
  await expect(page.getByText(completeWasActive ? "標記完成" : "已完成").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: bookmarkWasActive ? "收藏" : "已收藏",
    }),
  ).toBeVisible();
  await expect(page.getByText(completeWasActive ? "標記完成" : "已完成").first()).toBeVisible();

  await page.goto("/lessons/day-001");
  const questions = page.locator("fieldset.quiz-question");
  await expect(questions).toHaveCount(3);

  await questions.nth(0).locator("input").nth(1).check();
  await questions.nth(1).locator("input").nth(1).check();
  await questions.nth(2).locator("input").nth(0).check();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(page.getByText("得分 2 / 3")).toBeVisible();
  await expect(page.getByText("這題需要再複習。")).toBeVisible();

  await page.reload();
  await expect(page.getByText("最近測驗 2 / 3")).toBeVisible();

  await page.goto("/progress");
  await expect(page.getByText(/day-001-q3/)).toBeVisible();
});

test("AI page is clearly demo-only and supports all three mode previews", async ({ page }) => {
  const externalAiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("deepseek.com")) externalAiRequests.push(request.url());
  });
  await page.goto("/ai");
  await expect(page.getByText("示範資料，尚未連接 DeepSeek API。").first()).toBeVisible();

  const input = page.getByLabel("輸入問題");
  await input.fill("AES 和 RSA 如何分工？");
  await page.getByRole("button", { name: "送出問題" }).click();
  await expect(page.getByText("正在產生示範回應")).toBeVisible();
  await expect(page.getByText(/這是示範資料，不是 DeepSeek 的真實回答/)).toBeVisible();

  await page.getByRole("button", { name: "insufficient_evidence" }).click();
  await input.fill("不存在的教材內容");
  await page.getByRole("button", { name: "送出問題" }).click();
  await expect(page.getByText(/歷史知識庫沒有足夠段落/)).toBeVisible();

  await page.getByRole("button", { name: "general_extension" }).click();
  await input.fill("補充最新技術");
  await page.getByRole("button", { name: "送出問題" }).click();
  await expect(page.getByText(/模型延伸知識/)).toBeVisible();
  expect(externalAiRequests).toEqual([]);
});

test("360px, 390px, and 430px layouts do not overflow", async ({ page }) => {
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/knowledge", "/lessons/day-001", "/ai", "/progress", "/settings"]) {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();
      await expectNoBodyOverflow(page);
    }
  }
});

test("desktop layout exposes the persistent sidebar navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.locator(".desktop-sidebar")).toBeVisible();
  await expect(page.locator(".mobile-bottom-nav")).toBeHidden();
  await expectNoBodyOverflow(page);
});

test("all primary routes load without browser console or page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  for (const path of [
    "/",
    "/knowledge",
    "/lessons/day-002",
    "/ai",
    "/progress",
    "/settings",
    "/admin",
    "/admin/lessons/new",
  ]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.locator("body")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("content editors can create, preview, save, sync-fail visibly, version, publish, and archive", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "教材管理" })).toBeVisible();
  await page.getByRole("link", { name: "新增教材" }).click();
  await expect(page.getByRole("heading", { name: "建立新教材" })).toBeVisible();

  await page.getByLabel("標題").fill("E2E 教材生命週期");
  await page.getByLabel("摘要").fill("驗證 Draft、預覽、發布與封存。");
  await page.getByLabel("Markdown").fill("# E2E Lesson\n\n## 學習目標\n\n- 測試管理流程");
  await page.getByRole("button", { name: "預覽" }).click();
  await expect(page.getByRole("heading", { name: "學習目標" })).toBeVisible();
  await page.getByRole("button", { name: "回到編輯" }).click();
  await page.getByRole("button", { name: "保存工作版本" }).click();
  await expect(page.getByText("教材工作版本已保存")).toBeVisible();
  await expect(page.getByText("GitHub: pending")).toBeVisible();

  await page.getByRole("button", { name: "同步至 GitHub" }).click();
  await expect(page.getByText(/GitHub 同步目前停用/)).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "手動發布目前版本" }).click();
  await expect(page.getByText("教材已發布")).toBeVisible();
  await page.getByRole("button", { name: /^v1/ }).click();
  await expect(page.getByText("Historical Version")).toBeVisible();
  await page.getByRole("button", { name: "關閉版本" }).click();

  await page
    .getByLabel("Markdown")
    .fill("# E2E Lesson\n\n## 學習目標\n\n- 這是尚未發布的新工作版本");
  await page.getByRole("button", { name: "保存工作版本" }).click();
  await expect(page.getByText("未發布變更")).toBeVisible();

  await page.goto("/lessons/day-004");
  await expect(page.getByText(/測試管理流程/)).toBeVisible();
  await expect(page.getByText("這是尚未發布的新工作版本")).toHaveCount(0);
  await page.goto("/admin/lessons/day-004");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "手動發布目前版本" }).click();
  await expect(page.getByText("教材已發布")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "封存教材" }).click();
  await expect(page.getByText("教材已封存")).toBeVisible();
});

test("unauthenticated requests cannot modify learning data or read admin APIs", async () => {
  const writeResponse = await fetch(
    "http://127.0.0.1:3100/api/lessons/day-001/record",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    },
  );
  expect(writeResponse.status).toBe(401);

  const adminResponse = await fetch(
    "http://127.0.0.1:3100/api/admin/lessons",
  );
  expect(adminResponse.status).toBe(401);
});
