export const EDITOR_CATEGORIES = [
  "資訊安全與密碼學",
  "作業系統與 Windows",
  "計算機網路",
  "電腦硬體與計算機組織",
  "程式語言與編譯原理",
  "資料結構與演算法",
  "資料庫與資訊系統",
  "AI、雲端運算與新興技術",
] as const;

export type PublicationStatus = "draft" | "published" | "archived";

export type GitHubSyncStatus =
  | "local_only"
  | "pending"
  | "in_progress"
  | "synced"
  | "failed"
  | "conflict";

export type LessonEditorInput = {
  lessonId?: string;
  day?: number;
  title: string;
  category: string;
  lessonDate: string;
  summary: string;
  markdown: string;
  estimatedMinutes?: number;
  images?: unknown[];
  references?: unknown[];
  relatedTopics?: string[];
  tags?: string[];
};

export type ManagedLessonSummary = {
  id: string;
  day: number;
  title: string;
  category: string;
  lessonDate: string;
  summary: string;
  publishedStatus: PublicationStatus;
  githubSyncStatus: GitHubSyncStatus;
  githubPath: string | null;
  githubBranch: string | null;
  githubBlobSha: string | null;
  githubCommitSha: string | null;
  githubLastSyncedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  currentVersionNumber: number;
  publishedVersionId: number | null;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
  latestSyncError: string | null;
};

export type ManagedLessonVersion = {
  id: number;
  versionNumber: number;
  versionStatus: PublicationStatus;
  githubSyncStatus: GitHubSyncStatus;
  title: string;
  category: string;
  summary: string;
  markdown: string;
  createdAt: string;
  publishedAt: string | null;
  githubPath: string | null;
  githubBranch: string | null;
  githubBlobSha: string | null;
  githubCommitSha: string | null;
  isCurrent: boolean;
};

export type ManagedLessonDetail = ManagedLessonSummary & {
  markdown: string;
  estimatedMinutes: number;
  images: unknown[];
  references: unknown[];
  relatedTopics: string[];
  tags: string[];
  versions: ManagedLessonVersion[];
};

export type GitHubSyncJobView = {
  id: number;
  versionId: number;
  operation: "create" | "update";
  status: "pending" | "in_progress" | "synced" | "failed" | "conflict" | "cancelled";
  attemptCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  nextAttemptAt: string | null;
  githubPath: string | null;
  githubBlobSha: string | null;
  githubCommitSha: string | null;
  updatedAt: string;
};

export type AuthSessionResponse = {
  configured: boolean;
  authenticated: boolean;
  expiresAt?: string | null;
  required?: string[];
  message?: string;
};
