export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const method = (options?.method ?? "GET").toUpperCase();
  const csrfToken =
    typeof document !== "undefined"
      ? document.cookie
          .split(";")
          .map((value) => value.trim())
          .find((value) => value.startsWith("cs_daily_csrf="))
          ?.slice("cs_daily_csrf=".length)
      : undefined;
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(method)
        ? { "X-CSRF-Token": decodeURIComponent(csrfToken) }
        : {}),
      ...options?.headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;
  if (!response.ok) {
    throw new ApiError(
      body?.message ?? "伺服器無法完成請求。",
      response.status,
      body?.error,
    );
  }
  return body as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "發生未預期的錯誤，請稍後再試。";
}
