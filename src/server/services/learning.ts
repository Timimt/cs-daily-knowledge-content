import { and, asc, desc, eq, isNull, like, or, type SQL } from "drizzle-orm";
import { db } from "../db";
import {
  learningRecords,
  lessonVersions,
  lessons,
  quizAttempts,
  quizQuestions,
  type LearningRecordRow,
  type LessonRow,
  type LessonVersionRow,
  type QuizQuestionRow,
} from "../db/schema";
import { calculateStreak, createSearchSnippet } from "../lib/text";
import type {
  DashboardResponse,
  LearningRecord,
  LessonDetail,
  LessonImage,
  LessonListItem,
  LessonReference,
  ProgressResponse,
  QuizSubmission,
  WrongAnswer,
} from "../../shared/types";

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function defaultLearningRecord(lessonId: string): LearningRecord {
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

export function toLearningRecord(
  row: LearningRecordRow | null | undefined,
  lessonId: string,
): LearningRecord {
  if (!row) return defaultLearningRecord(lessonId);
  return {
    lessonId: row.lessonId,
    completed: row.completed,
    bookmarked: row.bookmarked,
    lastReadAt: row.lastReadAt,
    readCount: row.readCount,
    quizScore: row.quizScore,
    quizTotal: row.quizTotal,
    wrongAnswers: parseJsonArray<WrongAnswer>(row.wrongAnswersJson),
    updatedAt: row.updatedAt,
  };
}

function toListItem(
  lesson: LessonRow,
  published: LessonVersionRow,
  record: LearningRecordRow | null | undefined,
): LessonListItem {
  return {
    id: lesson.id,
    day: lesson.day,
    title: published.title,
    category: published.category,
    date: published.lessonDate,
    summary: published.summary,
    estimatedMinutes: published.estimatedMinutes,
    record: toLearningRecord(record, lesson.id),
  };
}

function buildSearchCondition(query: string): SQL | undefined {
  const normalized = query.trim();
  if (!normalized) return undefined;
  const terms = [normalized, ...normalized.split(/\s+/).filter(Boolean)].filter(
    (term, index, values) => values.indexOf(term) === index,
  );
  return or(
    ...terms.flatMap((term) => {
      const pattern = `%${term}%`;
      return [
        like(lessonVersions.title, pattern),
        like(lessonVersions.summary, pattern),
        like(lessonVersions.markdown, pattern),
        like(lessonVersions.category, pattern),
        like(lessonVersions.tagsJson, pattern),
      ];
    }),
  );
}

export function listLessons(query = "", category = ""): LessonListItem[] {
  const conditions: SQL[] = [
    eq(lessons.publicationStatus, "published"),
    isNull(lessons.archivedAt),
  ];
  const search = buildSearchCondition(query);
  if (search) conditions.push(search);
  if (category.trim()) {
    conditions.push(eq(lessonVersions.category, category.trim()));
  }

  const where = and(...conditions);
  const rows = db
    .select({
      lesson: lessons,
      published: lessonVersions,
      record: learningRecords,
    })
    .from(lessons)
    .innerJoin(lessonVersions, eq(lessonVersions.id, lessons.publishedVersionId))
    .leftJoin(learningRecords, eq(learningRecords.lessonId, lessons.id))
    .where(where)
    .orderBy(desc(lessons.day))
    .all();

  return rows.map(({ lesson, published, record }) => {
    const item = toListItem(lesson, published, record);
    return {
      ...item,
      snippet: createSearchSnippet(
        published.markdown,
        published.summary,
        query,
      ),
    };
  });
}

export function getLesson(id: string): LessonDetail | null {
  const row = db
    .select({ lesson: lessons, published: lessonVersions })
    .from(lessons)
    .innerJoin(lessonVersions, eq(lessonVersions.id, lessons.publishedVersionId))
    .where(
      and(
        eq(lessons.id, id),
        eq(lessons.publicationStatus, "published"),
        isNull(lessons.archivedAt),
      ),
    )
    .get();
  if (!row) return null;
  const { lesson, published } = row;
  const record = db
    .select()
    .from(learningRecords)
    .where(eq(learningRecords.lessonId, id))
    .get();
  const questions = db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.lessonId, id))
    .orderBy(asc(quizQuestions.position))
    .all();

  return {
    id: lesson.id,
    day: lesson.day,
    title: published.title,
    category: published.category,
    date: published.lessonDate,
    summary: published.summary,
    content: published.markdown,
    estimatedMinutes: published.estimatedMinutes,
    images: parseJsonArray<LessonImage>(published.imagesJson),
    references: parseJsonArray<LessonReference>(published.referencesJson),
    relatedTopics: parseJsonArray<string>(published.relatedTopicsJson),
    tags: parseJsonArray<string>(published.tagsJson),
    quiz: questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: parseJsonArray<string>(question.optionsJson),
      position: question.position,
    })),
    record: toLearningRecord(record, lesson.id),
  };
}

export function markLessonRead(id: string): LearningRecord {
  const lesson = db
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(
        eq(lessons.id, id),
        eq(lessons.publicationStatus, "published"),
        isNull(lessons.archivedAt),
      ),
    )
    .get();
  if (!lesson) throw new Error("LESSON_NOT_FOUND");
  const current = db
    .select()
    .from(learningRecords)
    .where(eq(learningRecords.lessonId, id))
    .get();
  const now = new Date().toISOString();
  const next = {
    lessonId: id,
    completed: current?.completed ?? false,
    bookmarked: current?.bookmarked ?? false,
    lastReadAt: now,
    readCount: (current?.readCount ?? 0) + 1,
    quizScore: current?.quizScore ?? null,
    quizTotal: current?.quizTotal ?? null,
    wrongAnswersJson: current?.wrongAnswersJson ?? "[]",
    updatedAt: now,
  };
  db.insert(learningRecords)
    .values(next)
    .onConflictDoUpdate({ target: learningRecords.lessonId, set: next })
    .run();
  return toLearningRecord({ ...next } as LearningRecordRow, id);
}

export function updateLearningRecord(
  id: string,
  changes: { completed?: boolean; bookmarked?: boolean },
): LearningRecord {
  const lesson = db
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(
        eq(lessons.id, id),
        eq(lessons.publicationStatus, "published"),
        isNull(lessons.archivedAt),
      ),
    )
    .get();
  if (!lesson) throw new Error("LESSON_NOT_FOUND");
  const current = db
    .select()
    .from(learningRecords)
    .where(eq(learningRecords.lessonId, id))
    .get();
  const now = new Date().toISOString();
  const next = {
    lessonId: id,
    completed: changes.completed ?? current?.completed ?? false,
    bookmarked: changes.bookmarked ?? current?.bookmarked ?? false,
    lastReadAt: current?.lastReadAt ?? null,
    readCount: current?.readCount ?? 0,
    quizScore: current?.quizScore ?? null,
    quizTotal: current?.quizTotal ?? null,
    wrongAnswersJson: current?.wrongAnswersJson ?? "[]",
    updatedAt: now,
  };
  db.insert(learningRecords)
    .values(next)
    .onConflictDoUpdate({ target: learningRecords.lessonId, set: next })
    .run();
  return toLearningRecord({ ...next } as LearningRecordRow, id);
}

export function submitQuiz(
  id: string,
  answers: Record<string, number>,
): QuizSubmission {
  const questions = db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.lessonId, id))
    .orderBy(asc(quizQuestions.position))
    .all();
  if (questions.length === 0) throw new Error("LESSON_NOT_FOUND");
  const publishedLesson = db
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(
        eq(lessons.id, id),
        eq(lessons.publicationStatus, "published"),
        isNull(lessons.archivedAt),
      ),
    )
    .get();
  if (!publishedLesson) throw new Error("LESSON_NOT_FOUND");
  if (
    questions.some((question) => {
      const selected = answers[question.id];
      const options = parseJsonArray<string>(question.optionsJson);
      return (
        typeof selected !== "number" ||
        !Number.isInteger(selected) ||
        selected < 0 ||
        selected >= options.length
      );
    })
  ) {
    throw new Error("INVALID_QUIZ_ANSWERS");
  }

  const attemptedAt = new Date().toISOString();
  const results = questions.map((question) => {
    const selectedOption = answers[question.id];
    return {
      questionId: question.id,
      selectedOption,
      correctOption: question.correctOption,
      isCorrect: selectedOption === question.correctOption,
      explanation: question.explanation,
    };
  });
  const wrongAnswers = results
    .filter((result) => !result.isCorrect)
    .map((result) => ({
      questionId: result.questionId,
      selectedOption: result.selectedOption,
    }));
  const score = results.filter((result) => result.isCorrect).length;
  const total = results.length;

  db.insert(quizAttempts)
    .values({
      lessonId: id,
      score,
      total,
      answersJson: JSON.stringify(answers),
      wrongAnswersJson: JSON.stringify(wrongAnswers),
      attemptedAt,
    })
    .run();

  const current = db
    .select()
    .from(learningRecords)
    .where(eq(learningRecords.lessonId, id))
    .get();
  const next = {
    lessonId: id,
    completed: current?.completed ?? false,
    bookmarked: current?.bookmarked ?? false,
    lastReadAt: current?.lastReadAt ?? null,
    readCount: current?.readCount ?? 0,
    quizScore: score,
    quizTotal: total,
    wrongAnswersJson: JSON.stringify(wrongAnswers),
    updatedAt: attemptedAt,
  };
  db.insert(learningRecords)
    .values(next)
    .onConflictDoUpdate({ target: learningRecords.lessonId, set: next })
    .run();

  return {
    lessonId: id,
    score,
    total,
    attemptedAt,
    results,
  };
}

function getAllLessonsWithRecords() {
  return db
    .select({
      lesson: lessons,
      published: lessonVersions,
      record: learningRecords,
    })
    .from(lessons)
    .innerJoin(lessonVersions, eq(lessonVersions.id, lessons.publishedVersionId))
    .leftJoin(learningRecords, eq(learningRecords.lessonId, lessons.id))
    .where(
      and(
        eq(lessons.publicationStatus, "published"),
        isNull(lessons.archivedAt),
      ),
    )
    .orderBy(desc(lessons.day))
    .all();
}

function buildDashboard(rows: ReturnType<typeof getAllLessonsWithRecords>): DashboardResponse {
  const completedCount = rows.filter(({ record }) => record?.completed).length;
  const recent = rows
    .filter(({ record }) => record?.lastReadAt)
    .map(({ lesson, published, record }) => ({
      ...toListItem(lesson, published, record),
      lastReadAt: record?.lastReadAt ?? "",
    }))
    .sort((a, b) => b.lastReadAt.localeCompare(a.lastReadAt))
    .slice(0, 5);
  const streak = calculateStreak(
    rows.map(({ record }) => record?.lastReadAt),
    new Date(),
  );
  const categoryCount = new Map<string, number>();
  for (const { published } of rows) {
    categoryCount.set(
      published.category,
      (categoryCount.get(published.category) ?? 0) + 1,
    );
  }
  const categories = [...categoryCount.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  return {
    todayLesson: rows[0]
      ? toListItem(rows[0].lesson, rows[0].published, rows[0].record)
      : (() => {
          throw new Error("NO_PUBLISHED_LESSONS");
        })(),
    streak,
    completedCount,
    totalLessons: rows.length,
    recent,
    categories,
  };
}

export function getDashboard(): DashboardResponse {
  return buildDashboard(getAllLessonsWithRecords());
}

export function getProgress(): ProgressResponse {
  const rows = getAllLessonsWithRecords();
  const dashboard = buildDashboard(rows);
  const attempts = db
    .select({
      attempt: quizAttempts,
      lessonTitle: lessonVersions.title,
    })
    .from(quizAttempts)
    .innerJoin(lessons, eq(lessons.id, quizAttempts.lessonId))
    .innerJoin(lessonVersions, eq(lessonVersions.id, lessons.publishedVersionId))
    .where(eq(lessons.publicationStatus, "published"))
    .orderBy(desc(quizAttempts.attemptedAt), desc(quizAttempts.id))
    .limit(20)
    .all();
  const scored = rows.filter(({ record }) => record?.quizTotal);
  const averageQuizPercent =
    scored.length > 0
      ? Math.round(
          scored.reduce(
            (sum, { record }) =>
              sum + ((record?.quizScore ?? 0) / (record?.quizTotal ?? 1)) * 100,
            0,
          ) / scored.length,
        )
      : null;

  return {
    streak: dashboard.streak,
    completedCount: dashboard.completedCount,
    totalLessons: dashboard.totalLessons,
    averageQuizPercent,
    records: rows.map(({ lesson, published, record }) => ({
      lesson: {
        ...toListItem(lesson, published, record),
        record: toLearningRecord(record, lesson.id),
      },
      lastReadAt: record?.lastReadAt ?? null,
      wrongAnswers: parseJsonArray<WrongAnswer>(record?.wrongAnswersJson),
    })),
    attempts: attempts.map(({ attempt, lessonTitle }) => ({
      id: attempt.id,
      lessonId: attempt.lessonId,
      lessonTitle: lessonTitle ?? attempt.lessonId,
      score: attempt.score,
      total: attempt.total,
      attemptedAt: attempt.attemptedAt,
      wrongAnswers: parseJsonArray<WrongAnswer>(attempt.wrongAnswersJson),
    })),
  };
}
