import { describe, expect, it } from "vitest";
import {
  GitHubApiError,
  GitHubAuthenticationError,
  GitHubConfigurationError,
  GitHubContentService,
  GitHubContentSecurityError,
  GitHubDeleteDisabledError,
  GitHubRateLimitError,
  GitHubShaConflictError,
  GitHubTimeoutError,
  GitHubValidationError,
} from "../../src/server/services/github-content";
import type { GitHubFetch } from "../../src/server/services/github-content";

type StoredFile = {
  content: string;
  sha: string;
  htmlUrl: string;
  versions: Map<string, { content: string; sha: string }>;
  history: Array<{
    sha: string;
    message: string;
    author: string;
    authoredAt: string;
  }>;
};

class MockGitHub {
  readonly files = new Map<string, StoredFile>();
  readonly calls: Array<{ method: string; url: string; authorization: string | null }> = [];
  forcedStatus: number | null = null;
  forcedMessage = "Mock GitHub failure";
  counter = 0;

  constructor(readonly token = "test-token") {}

  fetch: GitHubFetch = async (input, init) => {
    const url = new URL(input.toString());
    const headers = new Headers(init?.headers);
    const authorization = headers.get("Authorization");
    this.calls.push({
      method: init?.method ?? "GET",
      url: url.toString(),
      authorization,
    });

    if (authorization !== `Bearer ${this.token}`) {
      return this.error(401, "Bad credentials");
    }
    if (this.forcedStatus) {
      return this.error(this.forcedStatus, this.forcedMessage);
    }

    const prefix = "/repos/acme/cs-daily-content/";
    if (!url.pathname.startsWith(prefix)) {
      return this.error(404, "Not Found");
    }
    const resource = decodeURIComponent(url.pathname.slice(prefix.length));

    if (resource === "commits" && (init?.method ?? "GET") === "GET") {
      const path = url.searchParams.get("path") ?? "";
      const file = this.files.get(path);
      if (!file) return this.error(404, "Not Found");
      return this.json(
        [...file.history].reverse().map((entry) => ({
          sha: entry.sha,
          html_url: `https://github.com/acme/cs-daily-content/commit/${entry.sha}`,
          commit: {
            message: entry.message,
            author: { name: entry.author, date: entry.authoredAt },
          },
          author: { login: "acme" },
        })),
      );
    }

    if (resource.startsWith("contents/")) {
      const path = resource.slice("contents/".length);
      if ((init?.method ?? "GET") === "GET") {
        const file = this.files.get(path);
        if (!file) return this.error(404, "Not Found");
        const ref = url.searchParams.get("ref");
        const version =
          ref && ref !== "main" ? file.versions.get(ref) : undefined;
        if (ref && ref !== "main" && !version) {
          return this.error(404, "Not Found");
        }
        const selected = version ?? file;
        return this.json({
          type: "file",
          path,
          sha: selected.sha,
          encoding: "base64",
          content: Buffer.from(selected.content, "utf8").toString("base64"),
          html_url: file.htmlUrl,
        });
      }

      if ((init?.method ?? "GET") === "PUT") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          message?: string;
          content?: string;
          sha?: string;
        };
        const content = Buffer.from(body.content ?? "", "base64").toString("utf8");
        const existing = this.files.get(path);
        if (!existing && body.sha) {
          return this.error(409, "SHA does not match");
        }
        if (existing && body.sha !== existing.sha) {
          return this.error(409, "sha does not match");
        }
        if (!existing && !body.sha) {
          const file = this.createStoredFile(path, content, body.message ?? "");
          return this.json(this.mutationPayload(file, path, file.history[0].sha), 201);
        }
        if (existing) {
          const commitSha = this.nextSha();
          const newSha = this.nextSha();
          existing.content = content;
          existing.sha = newSha;
          existing.versions.set(commitSha, { content, sha: newSha });
          existing.history.push({
            sha: commitSha,
            message: body.message ?? "Update lesson",
            author: "Test Author",
            authoredAt: "2026-11-08T09:00:00.000Z",
          });
          return this.json(this.mutationPayload(existing, path, commitSha));
        }
      }
    }

    return this.error(404, "Not Found");
  };

  seed(path: string, content: string, message = "Initial lesson") {
    return this.createStoredFile(path, content, message);
  }

  private createStoredFile(path: string, content: string, message: string) {
    const commitSha = this.nextSha();
    const sha = this.nextSha();
    const file: StoredFile = {
      content,
      sha,
      htmlUrl: `https://github.com/acme/cs-daily-content/blob/main/${path}`,
      versions: new Map([[commitSha, { content, sha }]]),
      history: [
        {
          sha: commitSha,
          message,
          author: "Test Author",
          authoredAt: "2026-11-08T08:00:00.000Z",
        },
      ],
    };
    this.files.set(path, file);
    return file;
  }

  private mutationPayload(file: StoredFile, path: string, commitSha: string) {
    return {
      content: {
        path,
        sha: file.sha,
        html_url: file.htmlUrl,
      },
      commit: {
        sha: commitSha,
        html_url: `https://github.com/acme/cs-daily-content/commit/${commitSha}`,
      },
    };
  }

  private nextSha(): string {
    this.counter += 1;
    return this.counter.toString(16).padStart(40, "0");
  }

  private json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  private error(status: number, message: string): Response {
    return new Response(JSON.stringify({ message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function createService(mock: MockGitHub, extra: Record<string, unknown> = {}) {
  return new GitHubContentService({
    token: mock.token,
    owner: "acme",
    repo: "cs-daily-content",
    branch: "main",
    fetchImpl: mock.fetch,
    ...extra,
  });
}

describe("GitHubContentService", () => {
  it("creates and reads a lesson with a deterministic category path", async () => {
    const mock = new MockGitHub();
    const service = createService(mock);
    const markdown = "# Day 1\n\nAES and RSA.";

    const created = await service.createLesson({
      lessonId: "day-001",
      category: "cybersecurity",
      title: "AES 與 RSA",
      markdown,
    });

    expect(created.path).toBe("lessons/cybersecurity/day-001.md");
    expect(created.sha).toMatch(/^[a-f0-9]{40}$/);
    expect(created.commitSha).toMatch(/^[a-f0-9]{40}$/);
    expect(mock.calls[0].authorization).toBe("Bearer test-token");

    const byPath = await service.getLesson({ path: created.path });
    expect(byPath.markdown).toBe(markdown);
    expect(byPath.path).toBe(created.path);

    const byId = await service.getLesson({ lessonId: "day-001" });
    expect(byId.markdown).toBe(markdown);
  });

  it("updates a lesson, creates a new commit, and reads an old version and history", async () => {
    const mock = new MockGitHub();
    const service = createService(mock);
    const original = "# Original\n\nFirst version.";
    const updated = "# Updated\n\nSecond version.";
    const created = await service.createLesson({
      lessonId: "day-002",
      category: "作業系統與 Windows",
      title: "Windows Process",
      markdown: original,
    });

    const changed = await service.updateLesson({
      lessonId: "day-002",
      category: "operating-systems",
      title: "Windows Process and API",
      markdown: updated,
      expectedSha: created.sha,
    });

    expect(changed.path).toBe("lessons/operating-systems/day-002.md");
    expect(changed.commitSha).not.toBe(created.commitSha);
    expect(changed.sha).not.toBe(created.sha);

    const latest = await service.getLesson({ lessonId: "day-002" });
    expect(latest.markdown).toBe(updated);

    const oldVersion = await service.getLessonVersion(
      { path: created.path },
      created.commitSha,
    );
    expect(oldVersion.markdown).toBe(original);
    expect(oldVersion.commitSha).toBe(created.commitSha);

    const history = await service.getLessonHistory(
      { path: created.path },
      10,
    );
    expect(history).toHaveLength(2);
    expect(history[0].sha).toBe(changed.commitSha);
    expect(history[1].sha).toBe(created.commitSha);
    expect(history[0].author).toBe("Test Author");
    expect(history[0].authoredAt).toContain("2026-11-08");
  });

  it("does not overwrite a newer version when SHA conflicts", async () => {
    const mock = new MockGitHub();
    const service = createService(mock);
    const created = await service.createLesson({
      lessonId: "day-003",
      category: "cybersecurity",
      title: "Ransomware",
      markdown: "# One",
    });
    await service.updateLesson({
      path: created.path,
      title: "Ransomware",
      markdown: "# Two",
      expectedSha: created.sha,
    });

    await expect(
      service.updateLesson({
        path: created.path,
        title: "Ransomware",
        markdown: "# Three",
        expectedSha: created.sha,
      }),
    ).rejects.toBeInstanceOf(GitHubShaConflictError);

    const latest = await service.getLesson({ path: created.path });
    expect(latest.markdown).toBe("# Two");
  });

  it("rejects duplicate creates without replacing the existing file", async () => {
    const mock = new MockGitHub();
    const service = createService(mock);
    await service.createLesson({
      lessonId: "day-004",
      category: "networking",
      title: "TCP",
      markdown: "# Safe",
    });
    mock.forcedStatus = 422;
    mock.forcedMessage = "sha wasn't supplied, but file already exists";

    await expect(
      service.createLesson({
        lessonId: "day-004",
        category: "networking",
        title: "TCP replacement",
        markdown: "# Replaced",
      }),
    ).rejects.toBeInstanceOf(GitHubShaConflictError);

    expect(mock.files.get("lessons/networking/day-004.md")?.content).toBe("# Safe");
  });

  it("maps GitHub authentication, server, and rate-limit failures safely", async () => {
    const mock = new MockGitHub();
    const service = createService(mock);
    mock.forcedStatus = 500;
    await expect(service.getLesson({ path: "lessons/cybersecurity/missing.md" }))
      .rejects.toBeInstanceOf(GitHubApiError);

    mock.forcedStatus = 429;
    await expect(service.getLesson({ path: "lessons/cybersecurity/missing.md" }))
      .rejects.toBeInstanceOf(GitHubRateLimitError);

    mock.forcedStatus = null;
    const badAuth = new GitHubContentService({
      token: "wrong-token",
      owner: "acme",
      repo: "cs-daily-content",
      fetchImpl: mock.fetch,
    });
    await expect(badAuth.getLesson({ path: "lessons/cybersecurity/missing.md" }))
      .rejects.toBeInstanceOf(GitHubAuthenticationError);
  });

  it("maps 404 and non-conflict 422 responses to distinct errors", async () => {
    const mock = new MockGitHub();
    const service = createService(mock);
    await expect(
      service.getLesson({ path: "lessons/cybersecurity/missing.md" }),
    ).rejects.toMatchObject({ code: "GITHUB_NOT_FOUND" });

    mock.forcedStatus = 422;
    mock.forcedMessage = "Validation Failed: content is invalid";
    await expect(
      service.getLesson({ path: "lessons/cybersecurity/missing.md" }),
    ).rejects.toBeInstanceOf(GitHubValidationError);
  });

  it("handles missing configuration and never puts the token in an error", () => {
    expect(
      () =>
        new GitHubContentService({
          token: "",
          owner: "acme",
          repo: "cs-daily-content",
        }),
    ).toThrow(GitHubConfigurationError);

    expect(() => GitHubContentService.fromEnv({})).toThrow(
      GitHubConfigurationError,
    );

    const secret = "super-secret-token";
    const mock = new MockGitHub(secret);
    const service = createService(mock, { token: secret });
    mock.forcedStatus = 500;
    return expect(
      service.getLesson({ path: "lessons/cybersecurity/missing.md" }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(GitHubApiError);
      expect(JSON.stringify(error)).not.toContain(secret);
      expect((error as Error).message).not.toContain(secret);
      return true;
    });
  });

  it("rejects path traversal, unsafe extensions, and oversized content", async () => {
    const mock = new MockGitHub();
    const service = createService(mock, { maxMarkdownBytes: 20 });

    await expect(
      service.getLesson({
        path: "lessons/cybersecurity/../../secret.md",
      }),
    ).rejects.toBeInstanceOf(GitHubContentSecurityError);
    await expect(
      service.getLesson({
        path: "lessons/cybersecurity/not-a-lesson.txt",
      }),
    ).rejects.toBeInstanceOf(GitHubContentSecurityError);
    await expect(
      service.createLesson({
        lessonId: "day-005",
        category: "unknown-category",
        title: "Rejected",
        markdown: "# Lesson",
      }),
    ).rejects.toBeInstanceOf(GitHubContentSecurityError);
    await expect(
      service.createLesson({
        lessonId: "day-005",
        category: "cybersecurity",
        title: "Too large",
        markdown: "x".repeat(21),
      }),
    ).rejects.toMatchObject({ code: "GITHUB_CONTENT_TOO_LARGE" });
    expect(mock.calls).toHaveLength(0);
  });

  it("disables actual deletion and reports timeout safely", async () => {
    const mock = new MockGitHub();
    const service = createService(mock);
    await expect(
      service.deleteLesson({ lessonId: "day-001" }),
    ).rejects.toBeInstanceOf(GitHubDeleteDisabledError);

    const timeoutService = new GitHubContentService({
      token: "test-token",
      owner: "acme",
      repo: "cs-daily-content",
      timeoutMs: 100,
      fetchImpl: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    });
    await expect(
      timeoutService.getLesson({
        path: "lessons/cybersecurity/day-001.md",
      }),
    ).rejects.toBeInstanceOf(GitHubTimeoutError);
  });
});
