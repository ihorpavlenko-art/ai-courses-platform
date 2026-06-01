"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  category: string;
  text: string;
  options: QuizOption[];
}

interface QuizData {
  quizId: string;
  questions: QuizQuestion[];
  totalQuestions: number;
}

interface QuizResponseItem {
  questionId: string;
  selectedOptionId: string;
}

export default function QuizTakePage() {
  const router = useRouter();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load quiz data from sessionStorage
    const stored = sessionStorage.getItem("quizData");
    if (!stored) {
      router.push("/quiz");
      return;
    }

    try {
      const data: QuizData = JSON.parse(stored);
      if (!data.quizId || !data.questions || data.questions.length === 0) {
        throw new Error("Invalid quiz data");
      }
      setQuizData(data);
    } catch {
      sessionStorage.removeItem("quizData");
      router.push("/quiz");
    }
  }, [router]);

  if (!quizData) {
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
          <p className="text-[var(--muted)] text-[var(--font-size-sm)]">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const totalQuestions = quizData.questions.length;
  const currentQuestion = quizData.questions[currentIndex];
  const selectedOptionId = responses[currentQuestion.id] || null;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const progressPercentage = ((currentIndex + 1) / totalQuestions) * 100;

  const handleSelectOption = (optionId: string) => {
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const quizResponses: QuizResponseItem[] = quizData.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: responses[q.id] || "",
    }));

    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quizData.quizId,
          responses: quizResponses,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to submit quiz");
      }

      const results = await response.json();

      // Store results in sessionStorage for the results page
      sessionStorage.setItem("quizResults", JSON.stringify(results));
      // Clean up quiz data
      sessionStorage.removeItem("quizData");

      router.push("/quiz/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      ai_literacy: "AI Literacy",
      tool_proficiency: "Tool Proficiency",
      prompt_engineering: "Prompt Engineering",
      ethics: "Ethics",
      domain_application: "Domain Application",
    };
    return labels[category] || category;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)]">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-[var(--font-size-xs)] text-[var(--muted)] px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-full)]">
            {categoryLabel(currentQuestion.category)}
          </span>
        </div>
        {/* Progress Bar */}
        <div
          className="w-full h-2 bg-[var(--border)] rounded-[var(--radius-full)] overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progressPercentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Quiz progress: ${Math.round(progressPercentage)}% complete`}
        >
          <div
            className="h-full bg-[var(--primary)] rounded-[var(--radius-full)] transition-all duration-[var(--transition-base)]"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 mb-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--font-size-xl)] font-semibold text-[var(--foreground)] mb-6">
          {currentQuestion.text}
        </h2>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOptionId === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                className={`w-full text-left p-4 rounded-[var(--radius-lg)] border-2 transition-all duration-[var(--transition-fast)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] hover:border-[var(--muted)] hover:bg-[var(--card-hover)]"
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-[var(--transition-fast)] ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className={`text-[var(--font-size-sm)] ${isSelected ? "text-[var(--foreground)] font-medium" : "text-[var(--foreground)]"}`}>
                    {option.text}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 rounded-[var(--radius-md)] bg-[var(--error)]/10 border border-[var(--error)]/20">
          <p className="text-[var(--font-size-sm)] text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[var(--font-size-sm)] font-medium text-[var(--muted)] hover:text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-md)] transition-colors duration-[var(--transition-fast)] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Go to previous question"
        >
          <span aria-hidden="true">←</span>
          Previous
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedOptionId || isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-[var(--font-size-sm)] font-medium text-white bg-[var(--success)] hover:opacity-90 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition-all duration-[var(--transition-fast)] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Submit quiz"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                Submit Quiz
                <span aria-hidden="true">✓</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!selectedOptionId}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-[var(--font-size-sm)] font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] transition-all duration-[var(--transition-fast)] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Go to next question"
          >
            Next
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
