// Shared TypeScript types and interfaces for the AI Courses Platform

export type CourseProvider =
  | "coursera"
  | "edx"
  | "google"
  | "microsoft"
  | "deeplearning_ai";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export type QuizCategory =
  | "ai_literacy"
  | "tool_proficiency"
  | "prompt_engineering"
  | "ethics"
  | "domain_application";

export type MaturityLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface NormalizedCourse {
  id: string;
  externalId: string;
  title: string;
  provider: CourseProvider;
  description: string;
  url: string;
  duration: string;
  difficultyLevel: DifficultyLevel;
  topics: string[];
  thumbnailUrl: string;
  isFree: boolean;
  lastVerified: Date;
}

export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  text: string;
  options: { id: string; text: string; score: number }[];
  weight: number;
}

export interface QuizResponse {
  questionId: string;
  selectedOptionId: string;
}

export interface QuizResult {
  categoryScores: Record<QuizCategory, number>;
  totalScore: number;
  maturityLevel: MaturityLevel;
}

export interface QuizAttempt {
  userId: string;
  responses: QuizResponse[];
  categoryScores: Record<QuizCategory, number>;
  totalScore: number;
  maturityLevel: MaturityLevel;
  timestamp: Date;
}

/** @deprecated Use QuizAttempt instead */
export type QuizAttemptResult = QuizAttempt;

export interface CourseProgress {
  userId: string;
  courseId: string;
  sections: { sectionId: string; completed: boolean }[];
  completionPercentage: number;
  lastInteraction: Date;
}

export interface DashboardStats {
  coursesStarted: number;
  coursesCompleted: number;
  totalTimeOnPlatform: number; // minutes
  currentMaturityLevel: MaturityLevel | null;
  categoryProgress: Record<QuizCategory, number>;
}

export interface CourseListResponse {
  courses: NormalizedCourse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuizSubmitRequest {
  quizId: string;
  responses: QuizResponse[];
}

export interface QuizSubmitResponse {
  totalScore: number;
  maturityLevel: MaturityLevel;
  categoryScores: Record<QuizCategory, number>;
  recommendations: NormalizedCourse[];
}

export interface ProgressUpdateRequest {
  sectionId: string;
  completed: boolean;
}

export interface ProgressUpdateResponse {
  completionPercentage: number;
  sections: { sectionId: string; completed: boolean }[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  statusCode: number;
}
