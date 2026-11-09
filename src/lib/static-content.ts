import contentData from "../generated/public-content.json";
import type {
  LessonImage,
  LessonReference,
  PublicQuizQuestion,
} from "../shared/types";

export type StaticQuizQuestion = PublicQuizQuestion & {
  correctOption: number;
  explanation: string;
};

export type StaticLesson = {
  id: string;
  day: number;
  status: "published";
  title: string;
  category: string;
  lessonDate: string;
  summary: string;
  estimatedMinutes: number;
  images: LessonImage[];
  references: LessonReference[];
  relatedTopics: string[];
  tags: string[];
  quiz: StaticQuizQuestion[];
  markdown: string;
  githubPath: string;
  contentHash: string;
};

type GeneratedContent = {
  schemaVersion: number;
  lessons: StaticLesson[];
  draftLessonIds: string[];
};

const generated = contentData as GeneratedContent;

export const staticLessons = generated.lessons;
export const staticDraftLessonIds = generated.draftLessonIds;
export const contentSchemaVersion = generated.schemaVersion;

export function getStaticLesson(id: string): StaticLesson | null {
  return staticLessons.find((lesson) => lesson.id === id) ?? null;
}

export function searchStaticLessons(
  query = "",
  category = "",
): Array<{ lesson: StaticLesson; snippet: string }> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const normalizedCategory = category.trim();
  return staticLessons
    .filter((lesson) => {
      if (normalizedCategory && lesson.category !== normalizedCategory) return false;
      if (!normalizedQuery) return true;
      const searchable = [
        lesson.title,
        lesson.summary,
        lesson.category,
        lesson.markdown,
        lesson.tags.join(" "),
        lesson.relatedTopics.join(" "),
      ]
        .join("\n")
        .toLocaleLowerCase();
      return normalizedQuery.split(/\s+/).every((term) => searchable.includes(term));
    })
    .map((lesson) => ({
      lesson,
      snippet: createSnippet(lesson.markdown, lesson.summary, normalizedQuery),
    }));
}

export function staticCategories(): Array<{ category: string; count: number }> {
  const counts = new Map<string, number>();
  for (const lesson of staticLessons) {
    counts.set(lesson.category, (counts.get(lesson.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
}

export function toPublicQuizQuestions(lesson: StaticLesson): PublicQuizQuestion[] {
  return lesson.quiz.map(({ correctOption: _correctOption, explanation: _explanation, ...question }) => question);
}

export function gradeStaticQuiz(
  lesson: StaticLesson,
  answers: Record<string, number>,
  attemptedAt = new Date().toISOString(),
) {
  const results = lesson.quiz.map((question) => {
    const selectedOption = answers[question.id];
    if (
      typeof selectedOption !== "number" ||
      !Number.isInteger(selectedOption) ||
      selectedOption < 0 ||
      selectedOption >= question.options.length
    ) {
      throw new Error("請完成所有題目並選擇有效選項。");
    }
    return {
      questionId: question.id,
      selectedOption,
      correctOption: question.correctOption,
      isCorrect: selectedOption === question.correctOption,
      explanation: question.explanation,
    };
  });
  return {
    lessonId: lesson.id,
    score: results.filter((result) => result.isCorrect).length,
    total: results.length,
    attemptedAt,
    results,
  };
}

function createSnippet(markdown: string, fallback: string, query: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|$~[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!query) return fallback;
  const index = plain.toLocaleLowerCase().indexOf(query);
  if (index < 0) return fallback;
  const start = Math.max(0, index - 70);
  const end = Math.min(plain.length, index + query.length + 130);
  return `${start > 0 ? "…" : ""}${plain.slice(start, end)}${end < plain.length ? "…" : ""}`;
}
