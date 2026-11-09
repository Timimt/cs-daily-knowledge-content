export type CookieOptions = {
  maxAgeSeconds: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "Strict" | "Lax";
};

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const segments = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
    `SameSite=${options.sameSite ?? "Strict"}`,
  ];
  if (options.httpOnly) segments.push("HttpOnly");
  if (options.secure) segments.push("Secure");
  return segments.join("; ");
}
