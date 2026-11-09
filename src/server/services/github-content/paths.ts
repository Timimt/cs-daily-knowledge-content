import {
  ALLOWED_GITHUB_CATEGORIES,
  type GitHubLessonCategory,
} from "./types";
import {
  GitHubContentSecurityError,
  GitHubContentTooLargeError,
  GitHubValidationError,
} from "./errors";

const categoryAliases: Record<string, GitHubLessonCategory> = {
  cybersecurity: "cybersecurity",
  "資訊安全與密碼學": "cybersecurity",
  "資訊安全": "cybersecurity",
  "operating-systems": "operating-systems",
  "作業系統與 Windows": "operating-systems",
  "作業系統與 windows": "operating-systems",
  "作業系統與windows": "operating-systems",
  networking: "networking",
  "計算機網路": "networking",
  hardware: "hardware",
  "電腦硬體與計算機組織": "hardware",
  programming: "programming",
  "程式語言與編譯原理": "programming",
  algorithms: "algorithms",
  "資料結構與演算法": "algorithms",
  databases: "databases",
  "資料庫與資訊系統": "databases",
  "ai-cloud": "ai-cloud",
  "ai、雲端運算與新興技術": "ai-cloud",
};

const lessonIdPattern = /^[a-z0-9][a-z0-9-]{1,63}$/;
const contentPathPattern =
  /^lessons\/([a-z0-9-]+)\/([a-z0-9][a-z0-9-]{1,63})\.md$/;
const commitShaPattern = /^[a-f0-9]{7,64}$/i;

export function normalizeCategory(
  value: string,
  allowedCategories: readonly GitHubLessonCategory[] = ALLOWED_GITHUB_CATEGORIES,
): GitHubLessonCategory {
  const normalized = value.trim().toLocaleLowerCase();
  const category = categoryAliases[normalized];
  if (!category || !allowedCategories.includes(category)) {
    throw new GitHubContentSecurityError("Lesson category is not allowed.");
  }
  return category;
}

export function validateLessonId(lessonId: string): string {
  if (!lessonIdPattern.test(lessonId)) {
    throw new GitHubContentSecurityError(
      "Lesson ID must contain only lowercase letters, numbers, and hyphens.",
    );
  }
  return lessonId;
}

export function buildLessonPath(
  category: string,
  lessonId: string,
  allowedCategories: readonly GitHubLessonCategory[] = ALLOWED_GITHUB_CATEGORIES,
): string {
  const safeCategory = normalizeCategory(category, allowedCategories);
  const safeLessonId = validateLessonId(lessonId);
  return `lessons/${safeCategory}/${safeLessonId}.md`;
}

export function validateLessonPath(
  value: string,
  allowedCategories: readonly GitHubLessonCategory[] = ALLOWED_GITHUB_CATEGORIES,
): string {
  if (
    value.length > 220 ||
    value.includes("\\") ||
    value.includes("%") ||
    value.includes("\0") ||
    value.startsWith("/") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    throw new GitHubContentSecurityError("Lesson path contains unsafe characters.");
  }

  const segments = value.split("/");
  if (
    segments.some(
      (segment) => !segment || segment === "." || segment === "..",
    )
  ) {
    throw new GitHubContentSecurityError("Lesson path traversal is not allowed.");
  }

  const match = contentPathPattern.exec(value);
  if (!match) {
    throw new GitHubContentSecurityError(
      "Lesson path must use lessons/<category>/<lesson-id>.md.",
    );
  }
  const category = normalizeCategory(match[1], allowedCategories);
  const lessonId = validateLessonId(match[2]);
  return `lessons/${category}/${lessonId}.md`;
}

export function validateCommitSha(commitSha: string): string {
  if (!commitShaPattern.test(commitSha)) {
    throw new GitHubValidationError("GitHub commit SHA format is invalid.");
  }
  return commitSha;
}

export function validateMarkdown(title: string, markdown: string, maxBytes: number): void {
  if (!title.trim()) {
    throw new GitHubValidationError("Lesson title is required.");
  }
  if (title.length > 160) {
    throw new GitHubValidationError("Lesson title is too long.");
  }
  if (!markdown.trim()) {
    throw new GitHubValidationError("Lesson Markdown is empty.");
  }
  if (Buffer.byteLength(markdown, "utf8") > maxBytes) {
    throw new GitHubContentTooLargeError(maxBytes);
  }
}

export function safeCommitText(value: string, maxLength = 100): string {
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
