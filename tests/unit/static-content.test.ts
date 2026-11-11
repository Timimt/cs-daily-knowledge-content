import { describe, expect, it } from "vitest";
import {
  gradeStaticQuiz,
  searchStaticLessons,
  staticDraftLessonIds,
  staticLessons,
  toPublicQuizQuestions,
} from "../../src/lib/static-content";

describe("GitHub Pages static content", () => {
  it("publishes only the first three manually organized lessons", () => {
    expect(staticLessons.map((lesson) => lesson.id).sort()).toEqual([
      "O-001",
      "S-001",
      "S-002",
    ]);
    expect(staticDraftLessonIds).toEqual([]);
  });

  it("keeps lesson content, metadata, and three quizzes together", () => {
    for (const lesson of staticLessons) {
      expect(lesson.markdown.length).toBeGreaterThan(500);
      expect(lesson.githubPath).toMatch(/^lessons\/[a-z-]+\/[A-Z]-\d{3}\.md$/);
      expect(lesson.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(lesson.quiz).toHaveLength(3);
      expect(lesson.quiz.every((question) => question.options.length >= 2)).toBe(true);
    }
  });

  it("removes answers from the public question payload and grades locally", () => {
    const lesson = staticLessons.find((item) => item.id === "S-001");
    if (!lesson) throw new Error("S-001 fixture missing");
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
    expect(searchStaticLessons("Windows API")).toHaveLength(1);
    expect(searchStaticLessons("", "資訊安全與密碼學")).toHaveLength(2);
  });
});
