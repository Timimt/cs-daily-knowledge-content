export function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createSearchSnippet(
  content: string,
  summary: string,
  query: string,
  maxLength = 120,
): string {
  const cleanContent = stripMarkdown(content);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return summary;

  const normalizedContent = cleanContent.toLocaleLowerCase();
  const index = normalizedContent.indexOf(normalizedQuery);
  if (index === -1) {
    const token = normalizedQuery.split(/\s+/).find((part) => normalizedContent.includes(part));
    if (!token) return summary;
  }

  const anchor =
    index >= 0
      ? index
      : Math.max(0, normalizedContent.indexOf(normalizedQuery.split(/\s+/)[0] ?? ""));
  const start = Math.max(0, anchor - Math.floor(maxLength / 3));
  const end = Math.min(cleanContent.length, start + maxLength);
  const snippet = cleanContent.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${snippet}${end < cleanContent.length ? "…" : ""}`;
}

export function calculateStreak(
  timestamps: Array<string | null | undefined>,
  now = new Date(),
  timeZone = "Asia/Taipei",
): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localDay = (date: Date): string => {
    const parts = formatter.formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const activeDays = new Set(
    timestamps
      .filter((value): value is string => Boolean(value))
      .map((value) => localDay(new Date(value))),
  );
  if (activeDays.size === 0) return 0;

  const [year, month, day] = localDay(now).split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  const todayKey = localDay(now);
  if (!activeDays.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (
    activeDays.has(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(
        cursor.getUTCDate(),
      ).padStart(2, "0")}`,
    )
  ) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function slugifyHeading(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}
