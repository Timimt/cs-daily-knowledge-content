export type LearningRecord = {
  lessonId: string;
  completed: boolean;
  bookmarked: boolean;
  lastReadAt: string | null;
  readCount: number;
  quizScore: number | null;
  quizTotal: number | null;
  wrongAnswers: WrongAnswer[];
  updatedAt: string;
};

export type WrongAnswer = {
  questionId: string;
  selectedOption: number;
};

export type LessonSummary = {
  id: string;
  day: number;
  title: string;
  category: string;
  date: string;
  summary: string;
  snippet: string;
  estimatedMinutes: number;
  tags: string[];
  imageCount: number;
  record: LearningRecord;
};

export type PublicQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  position: number;
};

export type LessonImage =
  | {
      id: string;
      type: "inline-svg";
      variant: string;
      alt: string;
      caption?: string;
    }
  | {
      id: string;
      type: "external";
      src: string;
      alt: string;
      caption?: string;
    };

export type LessonReference = {
  title: string;
  url: string;
  publisher: string;
};

export type LessonDetail = {
  id: string;
  day: number;
  title: string;
  category: string;
  date: string;
  summary: string;
  content: string;
  estimatedMinutes: number;
  images: LessonImage[];
  references: LessonReference[];
  relatedTopics: string[];
  tags: string[];
  quiz: PublicQuizQuestion[];
  record: LearningRecord;
};

export type LessonListItem = {
  id: string;
  day: number;
  title: string;
  category: string;
  date: string;
  summary: string;
  estimatedMinutes: number;
  record: LearningRecord;
};

export type DashboardResponse = {
  todayLesson: LessonListItem;
  streak: number;
  completedCount: number;
  totalLessons: number;
  recent: Array<LessonListItem & { lastReadAt: string }>;
  categories: Array<{ category: string; count: number }>;
};

export type QuizResult = {
  questionId: string;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  explanation: string;
};

export type QuizSubmission = {
  lessonId: string;
  score: number;
  total: number;
  attemptedAt: string;
  results: QuizResult[];
};

export type ProgressResponse = {
  streak: number;
  completedCount: number;
  totalLessons: number;
  averageQuizPercent: number | null;
  records: Array<{
    lesson: LessonListItem;
    lastReadAt: string | null;
    wrongAnswers: WrongAnswer[];
  }>;
  attempts: Array<{
    id: number;
    lessonId: string;
    lessonTitle: string;
    score: number;
    total: number;
    attemptedAt: string;
    wrongAnswers: WrongAnswer[];
  }>;
};
