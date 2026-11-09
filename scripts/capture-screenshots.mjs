import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const outputDirectory = path.join(process.cwd(), "work", "screenshots");
fs.mkdirSync(outputDirectory, { recursive: true });
const baseUrl = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:5173";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});

if (process.env.CAPTURE_PASSWORD) {
  const login = await page.request.post(`${baseUrl}/api/auth/login`, {
    data: { password: process.env.CAPTURE_PASSWORD },
  });
  if (!login.ok()) {
    throw new Error(`Screenshot login failed with ${login.status()}`);
  }
}

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "dashboard-mobile-light.png"), fullPage: true });

await page.goto(`${baseUrl}/lessons/day-001`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "lesson-mobile-light.png"), fullPage: true });

await page.goto(`${baseUrl}/knowledge`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "knowledge-mobile-light.png"), fullPage: true });

await page.goto(`${baseUrl}/ai`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "ai-mobile-light.png"), fullPage: true });

await page.getByRole("button", { name: "深色" }).click();
await page.goto(`${baseUrl}/progress`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "progress-mobile-dark.png"), fullPage: true });

await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "settings-mobile-dark.png"), fullPage: true });

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "dashboard-mobile-dark.png"), fullPage: true });

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "dashboard-desktop-dark.png"), fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "admin-mobile-dark.png"), fullPage: true });

await page.goto(`${baseUrl}/admin/lessons/new`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outputDirectory, "admin-editor-mobile-dark.png"), fullPage: true });

await browser.close();
console.log(outputDirectory);
