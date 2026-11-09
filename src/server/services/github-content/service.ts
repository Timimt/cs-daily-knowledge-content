import {
  ALLOWED_GITHUB_CATEGORIES,
  type CreateLessonInput,
  type GitHubContentConfig,
  type GitHubFetch,
  type GitHubLessonCategory,
  type GitHubLessonDocument,
  type GitHubLessonFile,
  type GitHubLessonHistoryEntry,
  type GitHubLessonVersion,
  type LessonLocator,
  type UpdateLessonInput,
} from "./types";
import {
  GitHubApiError,
  GitHubAuthenticationError,
  GitHubConfigurationError,
  GitHubContentSecurityError,
  GitHubDeleteDisabledError,
  GitHubNetworkError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  GitHubShaConflictError,
  GitHubTimeoutError,
  GitHubValidationError,
} from "./errors";
import {
  buildLessonPath,
  normalizeCategory,
  safeCommitText,
  validateCommitSha,
  validateLessonId,
  validateLessonPath,
  validateMarkdown,
} from "./paths";

type GitHubContentsResponse = {
  type?: string;
  path: string;
  sha: string;
  content?: string;
  encoding?: string;
  html_url?: string;
};

type GitHubMutationResponse = {
  content?: {
    path?: string;
    sha?: string;
    html_url?: string;
  };
  commit?: {
    sha?: string;
    html_url?: string;
  };
};

type GitHubCommitResponse = {
  sha: string;
  html_url?: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string };
    committer?: { date?: string };
  };
  author?: { login?: string } | null;
};

type RequestOperation = "read" | "create" | "update" | "history";

const GITHUB_API_VERSION = "2022-11-28";
const DEFAULT_BRANCH = "main";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_MARKDOWN_BYTES = 512 * 1024;

function assertConfiguration(config: GitHubContentConfig) {
  const token = config.token?.trim();
  const owner = config.owner?.trim();
  const repo = config.repo?.trim();
  const branch = (config.branch || DEFAULT_BRANCH).trim();

  if (!token) throw new GitHubConfigurationError("GITHUB_TOKEN is required.");
  if (!owner || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)) {
    throw new GitHubConfigurationError("GITHUB_OWNER is invalid.");
  }
  if (!repo || !/^[A-Za-z0-9._-]{1,100}$/.test(repo)) {
    throw new GitHubConfigurationError("GITHUB_REPO is invalid.");
  }
  if (
    !branch ||
    branch.length > 200 ||
    branch.startsWith("/") ||
    branch.endsWith("/") ||
    branch.includes("..") ||
    branch.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(branch)
  ) {
    throw new GitHubConfigurationError("GITHUB_BRANCH is invalid.");
  }

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxMarkdownBytes =
    config.maxMarkdownBytes ?? DEFAULT_MAX_MARKDOWN_BYTES;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
    throw new GitHubConfigurationError("GitHub timeout must be between 100 and 60000 ms.");
  }
  if (
    !Number.isFinite(maxMarkdownBytes) ||
    maxMarkdownBytes < 1 ||
    maxMarkdownBytes > 5 * 1024 * 1024
  ) {
    throw new GitHubConfigurationError(
      "GitHub Markdown size limit must be between 1 byte and 5 MB.",
    );
  }

  return {
    token,
    owner,
    repo,
    branch,
    timeoutMs,
    maxMarkdownBytes,
  };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function decodeBase64(value: string | undefined): string {
  if (!value) throw new GitHubApiError("GitHub response did not include file content.", 502);
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

export class GitHubContentService {
  readonly #token: string;
  readonly #owner: string;
  readonly #repo: string;
  readonly #branch: string;
  readonly #timeoutMs: number;
  readonly #maxMarkdownBytes: number;
  readonly #fetch: GitHubFetch;
  readonly #allowedCategories: readonly GitHubLessonCategory[];

  constructor(config: GitHubContentConfig) {
    const valid = assertConfiguration(config);
    this.#token = valid.token;
    this.#owner = valid.owner;
    this.#repo = valid.repo;
    this.#branch = valid.branch;
    this.#timeoutMs = valid.timeoutMs;
    this.#maxMarkdownBytes = valid.maxMarkdownBytes;
    this.#fetch = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.#allowedCategories = ALLOWED_GITHUB_CATEGORIES;
  }

  static fromEnv(
    env: NodeJS.ProcessEnv = process.env,
    fetchImpl?: GitHubFetch,
  ): GitHubContentService {
    return new GitHubContentService({
      token: env.GITHUB_TOKEN ?? "",
      owner: env.GITHUB_OWNER ?? "",
      repo: env.GITHUB_REPO ?? "",
      branch: env.GITHUB_BRANCH ?? DEFAULT_BRANCH,
      fetchImpl,
    });
  }

  async createLesson(input: CreateLessonInput): Promise<GitHubLessonFile> {
    validateMarkdown(input.title, input.markdown, this.#maxMarkdownBytes);
    const lessonId = validateLessonId(input.lessonId);
    const path = buildLessonPath(input.category, lessonId, this.#allowedCategories);
    const message = `docs(${path.split("/")[1]}): add ${lessonId} - ${safeCommitText(input.title)}`;
    const result = await this.#request<GitHubMutationResponse>(
      `/contents/${encodePath(path)}`,
      {
        method: "PUT",
        operation: "create",
        path,
        body: {
          message,
          content: Buffer.from(input.markdown, "utf8").toString("base64"),
          branch: this.#branch,
        },
      },
    );
    return this.#mutationResult(result, path);
  }

  async getLesson(locator: LessonLocator): Promise<GitHubLessonDocument> {
    const path = await this.#resolvePath(locator);
    return this.#readDocument(path, this.#branch);
  }

  async updateLesson(input: UpdateLessonInput): Promise<GitHubLessonFile> {
    validateMarkdown(input.title, input.markdown, this.#maxMarkdownBytes);
    const path = await this.#resolvePath(input);
    const currentSha =
      input.expectedSha ??
      (await this.#readDocument(path, this.#branch)).sha;
    const message = `docs(${path.split("/")[1]}): update ${path.split("/")[2].replace(/\.md$/, "")} - ${safeCommitText(input.title)}`;
    const result = await this.#request<GitHubMutationResponse>(
      `/contents/${encodePath(path)}`,
      {
        method: "PUT",
        operation: "update",
        path,
        body: {
          message,
          content: Buffer.from(input.markdown, "utf8").toString("base64"),
          sha: currentSha,
          branch: this.#branch,
        },
      },
    );
    return this.#mutationResult(result, path);
  }

  async getLessonHistory(
    locator: LessonLocator,
    limit = 30,
  ): Promise<GitHubLessonHistoryEntry[]> {
    const path = await this.#resolvePath(locator);
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const commits = await this.#request<GitHubCommitResponse[]>(
      "/commits",
      {
        method: "GET",
        operation: "history",
        path,
        query: {
          path,
          sha: this.#branch,
          per_page: String(safeLimit),
        },
      },
    );
    if (!Array.isArray(commits)) {
      throw new GitHubApiError("GitHub history response was invalid.", 502);
    }
    return commits.map((entry) => ({
      sha: entry.sha,
      message: entry.commit.message.split("\n")[0],
      author:
        entry.commit.author?.name ?? entry.author?.login ?? "Unknown author",
      authoredAt:
        entry.commit.author?.date ??
        entry.commit.committer?.date ??
        new Date(0).toISOString(),
    }));
  }

  async getLessonVersion(
    locator: LessonLocator,
    commitSha: string,
  ): Promise<GitHubLessonVersion> {
    const safeCommitSha = validateCommitSha(commitSha);
    const path = await this.#resolvePath(locator);
    const document = await this.#readDocument(path, safeCommitSha);
    return { ...document, commitSha: safeCommitSha };
  }

  async deleteLesson(_locator: LessonLocator): Promise<never> {
    throw new GitHubDeleteDisabledError();
  }

  async #resolvePath(locator: LessonLocator): Promise<string> {
    if (locator.path && locator.lessonId) {
      throw new GitHubValidationError("Provide either path or lessonId, not both.");
    }
    if (locator.path) {
      return validateLessonPath(locator.path, this.#allowedCategories);
    }
    if (!locator.lessonId) {
      throw new GitHubValidationError("A lessonId or path is required.");
    }
    validateLessonId(locator.lessonId);
    if (locator.category) {
      return buildLessonPath(
        locator.category,
        locator.lessonId,
        this.#allowedCategories,
      );
    }

    for (const category of this.#allowedCategories) {
      const path = buildLessonPath(
        category,
        locator.lessonId,
        this.#allowedCategories,
      );
      try {
        await this.#readDocument(path, this.#branch);
        return path;
      } catch (error) {
        if (!(error instanceof GitHubNotFoundError)) throw error;
      }
    }
    throw new GitHubNotFoundError(locator.lessonId);
  }

  async #readDocument(
    path: string,
    ref: string,
  ): Promise<GitHubLessonDocument> {
    const file = await this.#request<GitHubContentsResponse>(
      `/contents/${encodePath(path)}`,
      {
        method: "GET",
        operation: "read",
        path,
        query: { ref },
      },
    );
    if (file.type && file.type !== "file") {
      throw new GitHubValidationError(`${path} is not a GitHub file.`);
    }
    const markdown = decodeBase64(file.content);
    if (Buffer.byteLength(markdown, "utf8") > this.#maxMarkdownBytes) {
      throw new GitHubContentSecurityError("Downloaded lesson exceeds the size limit.");
    }
    return {
      path: file.path || path,
      markdown,
      sha: file.sha,
      htmlUrl:
        file.html_url ??
        `https://github.com/${this.#owner}/${this.#repo}/blob/${encodeURIComponent(ref)}/${encodePath(path)}`,
    };
  }

  #mutationResult(
    response: GitHubMutationResponse,
    requestedPath: string,
  ): GitHubLessonFile {
    const contentSha = response.content?.sha;
    const commitSha = response.commit?.sha;
    if (!contentSha || !commitSha) {
      throw new GitHubApiError("GitHub mutation response was incomplete.", 502);
    }
    const path = response.content?.path ?? requestedPath;
    return {
      path,
      sha: contentSha,
      commitSha,
      htmlUrl:
        response.content?.html_url ??
        response.commit?.html_url ??
        `https://github.com/${this.#owner}/${this.#repo}/blob/${encodeURIComponent(this.#branch)}/${encodePath(path)}`,
    };
  }

  async #request<T>(
    resource: string,
    options: {
      method: "GET" | "PUT";
      operation: RequestOperation;
      path: string;
      query?: Record<string, string>;
      body?: Record<string, unknown>;
    },
  ): Promise<T> {
    const url = new URL(
      `/repos/${encodeURIComponent(this.#owner)}/${encodeURIComponent(this.#repo)}${resource}`,
      "https://api.github.com",
    );
    for (const [key, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    let response: Response;
    try {
      response = await this.#fetch(url, {
        method: options.method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.#token}`,
          "User-Agent": "cs-daily-knowledge",
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw new GitHubTimeoutError();
      }
      throw new GitHubNetworkError();
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      await this.#throwResponseError(response, options);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new GitHubApiError("GitHub returned an invalid JSON response.", response.status);
    }
  }

  async #throwResponseError(
    response: Response,
    options: {
      operation: RequestOperation;
      path: string;
    },
  ): Promise<never> {
    let message = `GitHub API request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string") {
        message = safeCommitText(body.message, 300);
      }
    } catch {
      // A non-JSON GitHub error is reported without exposing response headers.
    }

    if (response.status === 401) {
      throw new GitHubAuthenticationError();
    }
    if (response.status === 404) {
      throw new GitHubNotFoundError(options.path);
    }
    if (
      response.status === 429 ||
      response.status === 403 &&
        (response.headers.get("x-ratelimit-remaining") === "0" ||
          /rate limit/i.test(message))
    ) {
      throw new GitHubRateLimitError(
        response.headers.get("x-ratelimit-reset") ?? undefined,
      );
    }
    if (
      response.status === 409 ||
      response.status === 422 &&
        /sha|already exists|does not match|file already exists/i.test(message)
    ) {
      throw new GitHubShaConflictError(options.path);
    }
    if (response.status === 422) {
      throw new GitHubValidationError(message);
    }
    throw new GitHubApiError(message, response.status);
  }
}

export type {
  CreateLessonInput,
  GitHubContentConfig,
  GitHubLessonDocument,
  GitHubLessonFile,
  GitHubLessonHistoryEntry,
  GitHubLessonVersion,
  LessonLocator,
  UpdateLessonInput,
};
