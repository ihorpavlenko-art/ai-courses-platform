"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type QuizCategory =
  | "ai_literacy"
  | "tool_proficiency"
  | "prompt_engineering"
  | "ethics"
  | "domain_application";

type MaturityLevel = "beginner" | "intermediate" | "advanced" | "expert";

interface RecommendedCourse {
  id: string;
  title: string;
  provider: string;
  description: string;
  duration: string;
  difficultyLevel: string;
  thumbnailUrl: string | null;
  topics: string[];
}

interface QuizResults {
  totalScore: number;
  maturityLevel: MaturityLevel;
  categoryScores: Record<QuizCategory, number>;
  recommendations: RecommendedCourse[];
}

const CATEGORY_LABELS: Record<QuizCategory, { label: string; icon: string }> = {
  ai_literacy: { label: "AI Literacy", icon: "📖" },
  tool_proficiency: { label: "Tool Proficiency", icon: "🛠️" },
  prompt_engineering: { label: "Prompt Engineering", icon: "💬" },
  ethics: { label: "Ethics", icon: "⚖️" },
  domain_application: { label: "Domain Application", icon: "🎯" },
};

const MATURITY_CONFIG: Record<MaturityLevel, { label: string; color: string; bgColor: string; emoji: string }> = {
  beginner: { label: "Beginner", color: "text-blue-700", bgColor: "bg-blue-100", emoji: "🌱" },
  intermediate: { label: "Intermediate", color: "text-yellow-700", bgColor: "bg-yellow-100", emoji: "📈" },
  advanced: { label: "Advanced", color: "text-purple-700", bgColor: "bg-purple-100", emoji: "🚀" },
  expert: { label: "Expert", color: "text-green-700", bgColor: "bg-green-100", emoji: "🏆" },
};

function getScoreColor(score: number): string {
  if (score >= 76) return "bg-green-500";
  if (score >= 51) return "bg-purple-500";
  if (score >= 26) return "bg-yellow-500";
  return "bg-blue-500";
}

export default function QuizResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<QuizResults | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("quizResults");
    if (!stored) {
      router.push("/quiz");
      return;
    }

    try {
      const data: QuizResults = JSON.parse(stored);
      if (
        typeof data.totalScore !== "number" ||
        !data.maturityLevel ||
        !data.categoryScores
      ) {
        throw new Error("Invalid results data");
      }
      setResults(data);
    } catch {
      sessionStorage.removeItem("quizResults");
      router.push("/quiz");
    }
  }, [router]);

  const handleRetakeQuiz = () => {
    sessionStorage.removeItem("quizResults");
    router.push("/quiz");
  };

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-8 w-8 text-[var(--primary)]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[var(--muted)] text-[var(--font-size-sm)]">Loading results...</p>
        </div>
      </div>
    );
  }

  const maturity = MATURITY_CONFIG[results.maturityLevel];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Celebratory Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--primary)]/10 mb-4">
          <span className="text-5xl" aria-hidden="true">{maturity.emoji}</span>
        </div>
        <h1 className="text-[var(--font-size-3xl)] font-bold text-[var(--foreground)] mb-2">
          Quiz Complete!
        </h1>
        <p className="text-[var(--font-size-base)] text-[var(--muted)]">
          Here&apos;s your AI maturity assessment results
        </p>
      </div>

      {/* Score & Maturity Level Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 mb-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Score Circle */}
          <div className="relative flex items-center justify-center w-32 h-32 flex-shrink-0">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--border)"
                strokeWidth="12"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="12"
                strokeDasharray={`${(results.totalScore / 100) * 327} 327`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)]">
                {Math.round(results.totalScore)}
              </span>
              <span className="text-[var(--font-size-xs)] text-[var(--muted)]">out of 100</span>
            </div>
          </div>

          {/* Maturity Level */}
          <div className="text-center sm:text-left">
            <p className="text-[var(--font-size-sm)] text-[var(--muted)] mb-1">Your AI Maturity Level</p>
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] text-[var(--font-size-lg)] font-semibold ${maturity.bgColor} ${maturity.color}`}
            >
              <span aria-hidden="true">{maturity.emoji}</span>
              {maturity.label}
            </span>
            <p className="mt-3 text-[var(--font-size-sm)] text-[var(--muted)] max-w-md">
              {results.maturityLevel === "beginner" &&
                "You're just getting started with AI. The recommended courses below will help build a strong foundation."}
              {results.maturityLevel === "intermediate" &&
                "You have a solid understanding of AI basics. Focus on the areas below to level up your skills."}
              {results.maturityLevel === "advanced" &&
                "Great job! You have strong AI skills. The courses below will help you master advanced topics."}
              {results.maturityLevel === "expert" &&
                "Impressive! You're an AI expert. Keep exploring cutting-edge topics to stay ahead."}
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 mb-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-4">
          Category Breakdown
        </h2>
        <div className="space-y-4">
          {(Object.entries(results.categoryScores) as [QuizCategory, number][]).map(
            ([category, score]) => {
              const categoryInfo = CATEGORY_LABELS[category];
              if (!categoryInfo) return null;

              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base" aria-hidden="true">{categoryInfo.icon}</span>
                      <span className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)]">
                        {categoryInfo.label}
                      </span>
                    </div>
                    <span className="text-[var(--font-size-sm)] font-semibold text-[var(--foreground)]">
                      {Math.round(score)}%
                    </span>
                  </div>
                  <div
                    className="w-full h-2.5 bg-[var(--border)] rounded-[var(--radius-full)] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(score)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${categoryInfo.label}: ${Math.round(score)}%`}
                  >
                    <div
                      className={`h-full rounded-[var(--radius-full)] transition-all duration-500 ${getScoreColor(score)}`}
                      style={{ width: `${Math.round(score)}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Recommended Courses */}
      {results.recommendations && results.recommendations.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 mb-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-1">
            Recommended Courses
          </h2>
          <p className="text-[var(--font-size-sm)] text-[var(--muted)] mb-4">
            Based on your skill gaps, we recommend these courses to help you improve.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.recommendations.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="block p-4 rounded-[var(--radius-lg)] border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-[var(--shadow-sm)] transition-all duration-[var(--transition-fast)] group"
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-[var(--radius-md)] overflow-hidden flex-shrink-0 bg-[var(--border)]">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white text-lg">
                        📚
                      </div>
                    )}
                  </div>

                  {/* Course Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[var(--font-size-xs)] text-[var(--muted)]">
                        {course.provider}
                      </span>
                      <span className="text-[var(--border)]">•</span>
                      <span className="text-[var(--font-size-xs)] text-[var(--muted)]">
                        {course.duration}
                      </span>
                    </div>
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      course.difficultyLevel === "beginner"
                        ? "bg-green-100 text-green-800"
                        : course.difficultyLevel === "intermediate"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {course.difficultyLevel.charAt(0).toUpperCase() + course.difficultyLevel.slice(1)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 mb-8">
        <button
          onClick={handleRetakeQuiz}
          className="inline-flex items-center gap-2 px-6 py-3 text-[var(--font-size-sm)] font-medium text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] hover:bg-[var(--card-hover)] shadow-[var(--shadow-sm)] transition-all duration-[var(--transition-fast)]"
          aria-label="Retake the AI maturity quiz"
        >
          <span aria-hidden="true">🔄</span>
          Retake Quiz
        </button>
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 px-6 py-3 text-[var(--font-size-sm)] font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] transition-all duration-[var(--transition-fast)]"
        >
          Browse All Courses
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
