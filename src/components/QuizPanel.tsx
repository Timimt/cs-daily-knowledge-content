import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Send } from "lucide-react";
import { apiFetch, errorMessage } from "../lib/api";
import type {
  PublicQuizQuestion,
  QuizResult,
  QuizSubmission,
} from "../shared/types";
import { cn } from "../lib/format";

type QuizPanelProps = {
  lessonId: string;
  questions: PublicQuizQuestion[];
  onScored: (score: number, total: number) => void;
  canSubmit?: boolean;
  submitAnswers?: (answers: Record<string, number>) => Promise<QuizSubmission>;
  answerSource?: "server" | "local";
};

export function QuizPanel({
  lessonId,
  questions,
  onScored,
  canSubmit = true,
  submitAnswers,
  answerSource = "server",
}: QuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultsByQuestion = useMemo(() => {
    const map = new Map<string, QuizResult>();
    submission?.results.forEach((result) => map.set(result.questionId, result));
    return map;
  }, [submission]);

  const complete = questions.every((question) => typeof answers[question.id] === "number");

  async function submit() {
    if (!complete || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = submitAnswers
        ? await submitAnswers(answers)
        : await apiFetch<QuizSubmission>(`/api/lessons/${lessonId}/quiz-attempts`, {
            method: "POST",
            body: JSON.stringify({ answers }),
          });
      setSubmission(result);
      onScored(result.score, result.total);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmission(null);
    setError(null);
  }

  return (
    <section className="quiz-section" aria-labelledby="quiz-title">
      <div className="quiz-intro">
        <div>
          <h2 id="quiz-title">讀後測驗</h2>
          <p>
            共 {questions.length} 題。
            {answerSource === "local"
              ? "作答後會在這裡顯示答案與解析，結果只留在目前裝置。"
              : "提交後才會從伺服器取得答案與解析。"}
          </p>
        </div>
        {submission && (
          <span className="meta-pill is-success">
            得分 {submission.score} / {submission.total}
          </span>
        )}
      </div>

      {submission && (
        <div className="quiz-result-banner mt-5">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={18} />
            {answerSource === "local"
              ? "本次作答已保存在此瀏覽器，錯題也會寫入本機學習紀錄。"
              : "本次作答已保存，錯題也會記錄到學習紀錄。"}
          </span>
          <button type="button" className="secondary-button" onClick={reset}>
            <RotateCcw size={16} />
            重新作答
          </button>
        </div>
      )}

      {questions.map((question, questionIndex) => {
        const result = resultsByQuestion.get(question.id);
        return (
          <fieldset key={question.id} className="quiz-question">
            <legend className="quiz-question-prompt">
              <span className="quiz-number">{questionIndex + 1}</span>
              <span>{question.prompt}</span>
            </legend>
            <div className="quiz-options">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.id] === optionIndex;
                const showCorrect = result?.correctOption === optionIndex;
                const showWrong = Boolean(result && selected && !result.isCorrect);
                return (
                  <label
                    key={option}
                    className={cn(
                      "quiz-option",
                      showCorrect && "is-correct",
                      showWrong && "is-wrong",
                    )}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={optionIndex}
                      checked={selected}
                      disabled={Boolean(submission)}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: optionIndex,
                        }))
                      }
                    />
                    <span>
                      {String.fromCharCode(65 + optionIndex)}. {option}
                    </span>
                  </label>
                );
              })}
            </div>
            {result && (
              <div className="quiz-explanation">
                <strong className={result.isCorrect ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                  {result.isCorrect ? "回答正確。" : "這題需要再複習。"}
                </strong>{" "}
                {result.explanation}
              </div>
            )}
          </fieldset>
        );
      })}

      {error && (
        <p className="mt-4 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {!submission && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">
            {canSubmit
              ? `已作答 ${Object.keys(answers).length} / ${questions.length}`
              : "登入後才能提交並保存測驗紀錄。"}
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={!canSubmit || !complete || submitting}
          >
            <Send size={16} />
            {submitting ? "批改中…" : "提交答案"}
          </button>
        </div>
      )}
    </section>
  );
}
