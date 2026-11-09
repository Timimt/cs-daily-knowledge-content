import type {
  LearningRecord,
  ProgressResponse,
  QuizSubmission,
  WrongAnswer,
} from "../shared/types";
import { staticLessons, type StaticLesson } from "./static-content";

const STORAGE_KEY = "cs-daily-learning-v1";
const UPDATE_EVENT = "cs-daily-learning-updated";

type LocalAttempt = {
  id: number;
  lessonId: string;
  lessonTitle: string;
  score: number;
  total: number;
  attemptedAt: string;
  answers: Record<string, number>;
  wrongAnswers: WrongAnswer[];
};

type LocalLearningState = {
  version: 1;
  records: Record<string, LearningRecord>;
  attempts: LocalAttempt[];
};

export type LegacyLearningExport = {
  version: 1;
  exportedAt: string;
  records: LearningRecord[];
  attempts: Array<{
    lessonId: string;
    lessonTitle?: string;
    score: number;
    total: number;
    answers?: Record<string, number>;
    wrongAnswers?: WrongAnswer[];
    attemptedAt: string;
  }>;
};

function emptyState(): LocalLearningState {
  return { version: 1, records: {}, attempts: [] };
}

function readState(): LocalLearningState {
  if (typeof window === "undefined") return emptyState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (
      parsed?.version === 1 &&
      parsed.records &&
      typeof parsed.records === "object" &&
      Array.isArray(parsed.attempts)
    ) {
      return parsed as LocalLearningState;
    }
  } catch {
    // Corrupt local data stays untouched until the user imports a valid backup.
  }
  return emptyState();
}

function writeState(state: LocalLearningState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function defaultLocalRecord(lessonId: string): LearningRecord {
  return {
    lessonId,
    completed: false,
    bookmarked: false,
    lastReadAt: null,
    readCount: 0,
    quizScore: null,
    quizTotal: null,
    wrongAnswers: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function getLocalRecord(lessonId: string): LearningRecord {
  return readState().records[lessonId] ?? defaultLocalRecord(lessonId);
}

export function markLocalLessonRead(lessonId: string): LearningRecord {
  const state = readState();
  const current = state.records[lessonId] ?? defaultLocalRecord(lessonId);
  const now = new Date().toISOString();
  const record: LearningRecord = {
    ...current,
    lastReadAt: now,
    readCount: current.readCount + 1,
    updatedAt: now,
  };
  state.records[lessonId] = record;
  writeState(state);
  return record;
}

export function updateLocalRecord(
  lessonId: string,
  changes: Partial<Pick<LearningRecord, "completed" | "bookmarked">>,
): LearningRecord {
  const state = readState();
  const current = state.records[lessonId] ?? defaultLocalRecord(lessonId);
  const record: LearningRecord = {
    ...current,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  state.records[lessonId] = record;
  writeState(state);
  return record;
}

export function saveLocalQuizSubmission(submission: QuizSubmission): void {
  const lesson = staticLessons.find((item) => item.id === submission.lessonId);
  if (!lesson) throw new Error("找不到這篇教材。");
  const state = readState();
  const current = state.records[submission.lessonId] ?? defaultLocalRecord(submission.lessonId);
  const wrongAnswers = submission.results
    .filter((result) => !result.isCorrect)
    .map((result) => ({
      questionId: result.questionId,
      selectedOption: result.selectedOption,
    }));
  state.records[submission.lessonId] = {
    ...current,
    quizScore: submission.score,
    quizTotal: submission.total,
    wrongAnswers,
    updatedAt: submission.attemptedAt,
  };
  state.attempts.unshift({
    id: Date.now(),
    lessonId: submission.lessonId,
    lessonTitle: lesson.title,
    score: submission.score,
    total: submission.total,
    attemptedAt: submission.attemptedAt,
    answers: Object.fromEntries(
      submission.results.map((result) => [result.questionId, result.selectedOption]),
    ),
    wrongAnswers,
  });
  state.attempts = state.attempts.slice(0, 100);
  writeState(state);
}

export function getLocalProgress(): ProgressResponse {
  const state = readState();
  const lessonRows = staticLessons.map((lesson) => {
    const record = state.records[lesson.id] ?? defaultLocalRecord(lesson.id);
    return { lesson, record };
  });
  const completedCount = lessonRows.filter(({ record }) => record.completed).length;
  const readDates = lessonRows
    .map(({ record }) => record.lastReadAt)
    .filter((value): value is string => Boolean(value));
  const scored = lessonRows.filter(({ record }) => record.quizTotal);
  return {
    streak: calculateReadStreak(readDates),
    completedCount,
    totalLessons: staticLessons.length,
    averageQuizPercent:
      scored.length > 0
        ? Math.round(
            scored.reduce(
              (sum, { record }) =>
                sum + ((record.quizScore ?? 0) / (record.quizTotal ?? 1)) * 100,
              0,
            ) / scored.length,
          )
        : null,
    records: lessonRows.map(({ lesson, record }) => ({
      lesson: {
        id: lesson.id,
        day: lesson.day,
        title: lesson.title,
        category: lesson.category,
        date: lesson.lessonDate,
        summary: lesson.summary,
        estimatedMinutes: lesson.estimatedMinutes,
        record,
      },
      lastReadAt: record.lastReadAt,
      wrongAnswers: record.wrongAnswers,
    })),
    attempts: state.attempts.slice(0, 20).map((attempt) => ({
      id: attempt.id,
      lessonId: attempt.lessonId,
      lessonTitle: attempt.lessonTitle,
      score: attempt.score,
      total: attempt.total,
      attemptedAt: attempt.attemptedAt,
      wrongAnswers: attempt.wrongAnswers,
    })),
  };
}

export function exportLocalLearning(): LegacyLearningExport {
  const state = readState();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    records: staticLessons.map(
      (lesson) => state.records[lesson.id] ?? defaultLocalRecord(lesson.id),
    ),
    attempts: state.attempts.map((attempt) => ({
      lessonId: attempt.lessonId,
      lessonTitle: attempt.lessonTitle,
      score: attempt.score,
      total: attempt.total,
      answers: attempt.answers,
      wrongAnswers: attempt.wrongAnswers,
      attemptedAt: attempt.attemptedAt,
    })),
  };
}

export function importLegacyLearning(value: unknown): {
  importedRecords: number;
  importedAttempts: number;
} {
  if (!value || typeof value !== "object") throw new Error("備份格式不正確。");
  const input = value as Partial<LegacyLearningExport>;
  if (input.version !== 1 || !Array.isArray(input.records) || !Array.isArray(input.attempts)) {
    throw new Error("備份版本或欄位不正確。");
  }
  const knownLessonIds = new Set(staticLessons.map((lesson) => lesson.id));
  const state = readState();
  let importedRecords = 0;
  for (const record of input.records) {
    if (!record || typeof record.lessonId !== "string" || !knownLessonIds.has(record.lessonId)) {
      continue;
    }
    state.records[record.lessonId] = {
      ...defaultLocalRecord(record.lessonId),
      ...record,
      wrongAnswers: Array.isArray(record.wrongAnswers) ? record.wrongAnswers : [],
    };
    importedRecords += 1;
  }
  let importedAttempts = 0;
  for (const attempt of input.attempts) {
    if (
      !attempt ||
      typeof attempt.lessonId !== "string" ||
      !knownLessonIds.has(attempt.lessonId) ||
      !Number.isInteger(attempt.score) ||
      !Number.isInteger(attempt.total) ||
      typeof attempt.attemptedAt !== "string"
    ) {
      continue;
    }
    const lesson = staticLessons.find((item) => item.id === attempt.lessonId) as StaticLesson;
    state.attempts.push({
      id: Date.now() + importedAttempts,
      lessonId: attempt.lessonId,
      lessonTitle: attempt.lessonTitle ?? lesson.title,
      score: attempt.score,
      total: attempt.total,
      attemptedAt: attempt.attemptedAt,
      answers: attempt.answers ?? {},
      wrongAnswers: Array.isArray(attempt.wrongAnswers) ? attempt.wrongAnswers : [],
    });
    importedAttempts += 1;
  }
  state.attempts.sort((left, right) => right.attemptedAt.localeCompare(left.attemptedAt));
  writeState(state);
  return { importedRecords, importedAttempts };
}

export function subscribeLocalLearning(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener(UPDATE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(UPDATE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function calculateReadStreak(dates: string[]): number {
  const days = new Set(
    dates.map((value) => {
      const date = new Date(value);
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }),
  );
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}-${cursor.getDate()}`;
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
