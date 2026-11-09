import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContentManagementError,
  ContentManagementService,
  type GitHubContentClient,
} from "../../src/server/content/management-service";
import {
  GitHubApiError,
  GitHubShaConflictError,
} from "../../src/server/services/github-content";
import {
  MemoryGitHubSyncRecoveryStore,
} from "../../src/server/content/sync-recovery";
import { createLegacyTestDatabase, type TestDatabase } from "./helpers/test-db";

const sha = (value: number) => value.toString(16).padStart(40, "0");

function createMockGitHub() {
  let counter = 100;
  const createLesson = vi.fn(async (input: { lessonId: string; category: string }) => ({
    path: `lessons/cybersecurity/${input.lessonId}.md`,
    sha: sha(counter++),
    commitSha: sha(counter++),
    htmlUrl: `https://github.com/acme/content/blob/main/lessons/cybersecurity/${input.lessonId}.md`,
  }));
  const updateLesson = vi.fn(async (input: { path?: string }) => ({
    path: input.path ?? "lessons/cybersecurity/day-001.md",
    sha: sha(counter++),
    commitSha: sha(counter++),
    htmlUrl: `https://github.com/acme/content/blob/main/${input.path ?? "lessons/cybersecurity/day-001.md"}`,
  }));
  const client: GitHubContentClient = {
    createLesson,
    updateLesson,
    getLesson: vi.fn(),
    getLessonHistory: vi.fn(async () => []),
    getLessonVersion: vi.fn(),
  };
  return { client, createLesson, updateLesson };
}

const editorInput = {
  title: "木馬程式基礎",
  category: "資訊安全與密碼學" as const,
  lessonDate: "2026-11-09",
  summary: "理解木馬程式的基本概念與防禦方式。",
  markdown: "# 木馬程式\n\n這是一篇教材。",
  estimatedMinutes: 7,
  images: [],
  references: [],
  relatedTopics: ["惡意程式"],
  tags: ["Trojan", "惡意程式"],
};

describe("ContentManagementService", () => {
  let fixture: TestDatabase;
  let recovery: MemoryGitHubSyncRecoveryStore;
  let mock: ReturnType<typeof createMockGitHub>;

  beforeEach(() => {
    fixture = createLegacyTestDatabase();
    recovery = new MemoryGitHubSyncRecoveryStore();
    mock = createMockGitHub();
  });

  afterEach(() => fixture.cleanup());

  it("creates a draft and queues sync without calling GitHub", () => {
    const service = new ContentManagementService(
      fixture.database,
      mock.client,
      recovery,
      "main",
    );
    const created = service.createDraft(editorInput);
    expect(created.id).toBe("day-004");
    expect(created.publishedStatus).toBe("draft");
    expect(created.githubSyncStatus).toBe("pending");
    expect(created.versions).toHaveLength(1);
    expect(mock.createLesson).not.toHaveBeenCalled();
    expect(mock.updateLesson).not.toHaveBeenCalled();
  });

  it("publishes only the current validated version and preserves prior published content", () => {
    const service = new ContentManagementService(
      fixture.database,
      mock.client,
      recovery,
      "main",
    );
    const draft = service.createDraft(editorInput);
    const published = service.publishLesson(draft.id, draft.currentVersionNumber);
    expect(published.publishedStatus).toBe("published");
    expect(published.publishedAt).toBeTruthy();
    expect(published.hasUnpublishedChanges).toBe(false);

    const edited = service.updateDraft(
      draft.id,
      {
        ...editorInput,
        title: "木馬程式進階",
        markdown: "# Updated\n\n尚未發布的版本。",
      },
      published.currentVersionNumber,
    );
    expect(edited.publishedStatus).toBe("published");
    expect(edited.hasUnpublishedChanges).toBe(true);
    expect(edited.publishedVersionId).toBe(published.publishedVersionId);
    expect(edited.currentVersionNumber).toBe(2);
    expect(service.getVersion(draft.id, 1).markdown).toContain("這是一篇教材");
  });

  it("rejects invalid transitions and version conflicts", () => {
    const service = new ContentManagementService(
      fixture.database,
      mock.client,
      recovery,
      "main",
    );
    const draft = service.createDraft(editorInput);
    const published = service.publishLesson(draft.id, 1);
    const edited = service.updateDraft(draft.id, editorInput, 1);
    expect(edited.currentVersionNumber).toBe(2);
    expect(() => service.updateDraft(draft.id, editorInput, 1)).toThrow(
      ContentManagementError,
    );
    const archived = service.archiveLesson(draft.id);
    expect(archived.publishedStatus).toBe("archived");
    expect(() => service.updateDraft(draft.id, editorInput, 2)).toThrow(
      ContentManagementError,
    );
    expect(published.publishedStatus).toBe("published");
  });

  it("syncs a draft through mock GitHub and updates version metadata", async () => {
    const service = new ContentManagementService(
      fixture.database,
      mock.client,
      recovery,
      "main",
    );
    const draft = service.createDraft(editorInput);
    const job = await service.syncLesson(draft.id);
    expect(job.status).toBe("synced");
    expect(mock.createLesson).toHaveBeenCalledTimes(1);
    const synced = service.getLesson(draft.id);
    expect(synced.githubSyncStatus).toBe("synced");
    expect(synced.githubPath).toContain("day-004.md");
    expect(synced.githubBranch).toBe("main");
    expect(synced.githubBlobSha).toMatch(/^[a-f0-9]{40}$/);
  });

  it("retries after failure and preserves local content", async () => {
    mock.createLesson.mockRejectedValueOnce(new GitHubApiError("temporary", 500));
    const service = new ContentManagementService(
      fixture.database,
      mock.client,
      recovery,
      "main",
    );
    const draft = service.createDraft(editorInput);
    await expect(service.syncLesson(draft.id)).rejects.toMatchObject({
      code: "GITHUB_SYNC_FAILED",
    });
    let lesson = service.getLesson(draft.id);
    expect(lesson.githubSyncStatus).toBe("failed");
    expect(lesson.markdown).toBe(editorInput.markdown);

    const retried = await service.syncLesson(draft.id);
    expect(retried.status).toBe("synced");
    expect(retried.attemptCount).toBe(2);
    lesson = service.getLesson(draft.id);
    expect(lesson.githubSyncStatus).toBe("synced");
  });

  it("marks SHA conflicts without overwriting local or remote content", async () => {
    const service = new ContentManagementService(
      fixture.database,
      mock.client,
      recovery,
      "main",
    );
    const draft = service.createDraft(editorInput);
    await service.syncLesson(draft.id);
    const updated = service.updateDraft(
      draft.id,
      { ...editorInput, markdown: "# Local update" },
      1,
    );
    expect(updated.githubSyncStatus).toBe("pending");
    mock.updateLesson.mockRejectedValueOnce(
      new GitHubShaConflictError("lessons/cybersecurity/day-004.md"),
    );

    await expect(service.syncLesson(draft.id)).rejects.toMatchObject({
      code: "GITHUB_SYNC_CONFLICT",
    });
    const lesson = service.getLesson(draft.id);
    expect(lesson.githubSyncStatus).toBe("conflict");
    expect(lesson.markdown).toBe("# Local update");
    expect(
      (fixture.database
        .prepare(
          "SELECT status FROM github_sync_jobs WHERE lesson_id = ? ORDER BY id DESC LIMIT 1",
        )
        .get(draft.id) as { status: string }).status,
    ).toBe("conflict");
  });

  it("prevents duplicate submission while a sync is in progress", async () => {
    let resolveRemote!: (value: Awaited<ReturnType<GitHubContentClient["createLesson"]>>) => void;
    mock.createLesson.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveRemote = resolve;
      }),
    );
    const service = new ContentManagementService(
      fixture.database,
      mock.client,
      recovery,
      "main",
    );
    const draft = service.createDraft(editorInput);
    const first = service.syncLesson(draft.id);
    await expect(service.syncLesson(draft.id)).rejects.toMatchObject({
      code: "GITHUB_SYNC_IN_PROGRESS",
    });
    resolveRemote({
      path: "lessons/cybersecurity/day-004.md",
      sha: sha(500),
      commitSha: sha(501),
      htmlUrl: "https://github.com/acme/content/blob/main/lessons/cybersecurity/day-004.md",
    });
    await expect(first).resolves.toMatchObject({ status: "synced" });
  });

  it("stores a recovery record if SQLite fails after GitHub success", async () => {
    const service = new ContentManagementService(
      fixture.database,
      mock.client,
      recovery,
      "main",
    );
    const draft = service.createDraft(editorInput);
    fixture.database.exec(`
      CREATE TRIGGER fail_sync_commit
      BEFORE UPDATE OF status ON github_sync_jobs
      WHEN NEW.status = 'synced'
      BEGIN
        SELECT RAISE(ABORT, 'simulated sqlite failure');
      END;
    `);
    await expect(service.syncLesson(draft.id)).rejects.toMatchObject({
      code: "GITHUB_SYNC_PERSISTENCE_FAILED",
    });
    expect(recovery.records).toHaveLength(1);
    expect(recovery.records[0]).toMatchObject({
      lessonId: draft.id,
      remote: expect.objectContaining({
        path: "lessons/cybersecurity/day-004.md",
      }),
    });
    expect(mock.createLesson).toHaveBeenCalledTimes(1);
  });

  it("does not call GitHub when sync is disabled", async () => {
    const service = new ContentManagementService(
      fixture.database,
      null,
      recovery,
    );
    const draft = service.createDraft(editorInput);
    await expect(service.syncLesson(draft.id)).rejects.toMatchObject({
      code: "GITHUB_SYNC_DISABLED",
      status: 503,
    });
    expect(mock.createLesson).not.toHaveBeenCalled();
  });
});
