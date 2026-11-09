export const ALLOWED_GITHUB_CATEGORIES = [
  "cybersecurity",
  "operating-systems",
  "networking",
  "hardware",
  "programming",
  "algorithms",
  "databases",
  "ai-cloud",
] as const;

export type GitHubLessonCategory = (typeof ALLOWED_GITHUB_CATEGORIES)[number];

export type GitHubFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type GitHubContentConfig = {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  timeoutMs?: number;
  maxMarkdownBytes?: number;
  fetchImpl?: GitHubFetch;
};

export type CreateLessonInput = {
  lessonId: string;
  category: GitHubLessonCategory | string;
  title: string;
  markdown: string;
};

export type LessonLocator = {
  lessonId?: string;
  category?: GitHubLessonCategory | string;
  path?: string;
};

export type UpdateLessonInput = {
  lessonId?: string;
  category?: GitHubLessonCategory | string;
  path?: string;
  title: string;
  markdown: string;
  expectedSha?: string;
};

export type GitHubLessonFile = {
  path: string;
  sha: string;
  commitSha: string;
  htmlUrl: string;
};

export type GitHubLessonDocument = {
  path: string;
  markdown: string;
  sha: string;
  htmlUrl: string;
};

export type GitHubLessonVersion = GitHubLessonDocument & {
  commitSha: string;
};

export type GitHubLessonHistoryEntry = {
  sha: string;
  message: string;
  author: string;
  authoredAt: string;
};
