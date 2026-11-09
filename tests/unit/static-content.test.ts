import { describe, expect, it } from "vitest";
import {
  gradeStaticQuiz,
  searchStaticLessons,
  staticDraftLessonIds,
  staticLessons,
  toPublicQuizQuestions,
} from "../../src/lib/static-content";

describe("GitHub Pages static content", () => {
  it("publishes the approved lessons and excludes the day-004 draft", () => {
    expect(staticLessons.length).toBeGreaterThanOrEqual(23);
    expect(staticLessons[0].id).toBe("day-024");
    for (const id of ["day-001", "day-002", "day-003"]) {
      expect(staticLessons.some((lesson) => lesson.id === id)).toBe(true);
    }
    expect(staticDraftLessonIds).toEqual(["day-004"]);
    expect(staticLessons.some((lesson) => lesson.id === "day-004")).toBe(false);
  });

  it("keeps lesson content, metadata, and three quizzes together", () => {
    for (const lesson of staticLessons) {
      expect(lesson.markdown.length).toBeGreaterThan(500);
      expect(lesson.githubPath).toMatch(/^lessons\/[a-z-]+\/day-\d{3}\.md$/);
      expect(lesson.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(lesson.quiz).toHaveLength(3);
      expect(lesson.quiz.every((question) => question.options.length >= 2)).toBe(true);
    }
  });

  it("removes answers from the public question payload and grades locally", () => {
    const lesson = staticLessons.find((item) => item.id === "day-001");
    if (!lesson) throw new Error("day-001 fixture missing");
    const publicQuestions = toPublicQuizQuestions(lesson);
    expect(publicQuestions).toHaveLength(3);
    expect(publicQuestions[0]).not.toHaveProperty("correctOption");
    expect(publicQuestions[0]).not.toHaveProperty("explanation");

    const answers = Object.fromEntries(
      lesson.quiz.map((question) => [question.id, question.correctOption]),
    );
    const submission = gradeStaticQuiz(lesson, answers, "2026-11-09T00:00:00.000Z");
    expect(submission.score).toBe(3);
    expect(submission.total).toBe(3);
  });

  it("searches content and category metadata without a server", () => {
    expect(searchStaticLessons("Windows API")).toHaveLength(2);
    expect(searchStaticLessons("", "資訊安全與密碼學").length).toBeGreaterThan(2);
  });
});
