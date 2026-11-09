export type GitHubContentErrorCode =
  | "GITHUB_CONFIGURATION_ERROR"
  | "GITHUB_AUTHENTICATION_ERROR"
  | "GITHUB_NOT_FOUND"
  | "GITHUB_RATE_LIMIT"
  | "GITHUB_SHA_CONFLICT"
  | "GITHUB_VALIDATION_ERROR"
  | "GITHUB_TIMEOUT"
  | "GITHUB_NETWORK_ERROR"
  | "GITHUB_API_ERROR"
  | "GITHUB_SECURITY_ERROR"
  | "GITHUB_CONTENT_TOO_LARGE"
  | "GITHUB_DELETE_DISABLED";

export class GitHubContentError extends Error {
  readonly code: GitHubContentErrorCode;
  readonly status?: number;

  constructor(code: GitHubContentErrorCode, message: string, status?: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class GitHubConfigurationError extends GitHubContentError {
  constructor(message = "GitHub content service is not configured.") {
    super("GITHUB_CONFIGURATION_ERROR", message);
  }
}

export class GitHubAuthenticationError extends GitHubContentError {
  constructor(message = "GitHub authentication failed.") {
    super("GITHUB_AUTHENTICATION_ERROR", message, 401);
  }
}

export class GitHubNotFoundError extends GitHubContentError {
  constructor(path?: string) {
    super(
      "GITHUB_NOT_FOUND",
      path ? `GitHub content was not found: ${path}` : "GitHub content was not found.",
      404,
    );
  }
}

export class GitHubRateLimitError extends GitHubContentError {
  readonly resetAt?: string;

  constructor(resetAt?: string) {
    super(
      "GITHUB_RATE_LIMIT",
      resetAt
        ? `GitHub API rate limit reached. Retry after ${resetAt}.`
        : "GitHub API rate limit reached.",
      429,
    );
    this.resetAt = resetAt;
  }
}

export class GitHubShaConflictError extends GitHubContentError {
  constructor(path: string) {
    super(
      "GITHUB_SHA_CONFLICT",
      `GitHub content changed before this update could be applied: ${path}`,
      409,
    );
  }
}

export class GitHubValidationError extends GitHubContentError {
  constructor(message: string, status = 422) {
    super("GITHUB_VALIDATION_ERROR", message, status);
  }
}

export class GitHubTimeoutError extends GitHubContentError {
  constructor() {
    super("GITHUB_TIMEOUT", "GitHub API request timed out.");
  }
}

export class GitHubNetworkError extends GitHubContentError {
  constructor() {
    super("GITHUB_NETWORK_ERROR", "Could not reach the GitHub API.");
  }
}

export class GitHubApiError extends GitHubContentError {
  constructor(message: string, status: number) {
    super("GITHUB_API_ERROR", message, status);
  }
}

export class GitHubContentSecurityError extends GitHubContentError {
  constructor(message: string) {
    super("GITHUB_SECURITY_ERROR", message);
  }
}

export class GitHubContentTooLargeError extends GitHubContentError {
  constructor(maxBytes: number) {
    super(
      "GITHUB_CONTENT_TOO_LARGE",
      `Lesson Markdown exceeds the ${maxBytes}-byte limit.`,
    );
  }
}

export class GitHubDeleteDisabledError extends GitHubContentError {
  constructor() {
    super(
      "GITHUB_DELETE_DISABLED",
      "Deleting lesson files is disabled. Keep history by unpublishing instead.",
    );
  }
}
