"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  { name: "AI Literacy", icon: "📖", description: "Understanding core AI concepts and terminology" },
  { name: "Tool Proficiency", icon: "🛠️", description: "Hands-on experience with AI tools and platforms" },
  { name: "Prompt Engineering", icon: "💬", description: "Crafting effective prompts for AI systems" },
  { name: "Ethics", icon: "⚖️", description: "Awareness of AI ethics, bias, and responsible use" },
  { name: "Domain Application", icon: "🎯", description: "Applying AI solutions to real-world problems" },
];

export default function QuizPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartQuiz = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to generate quiz");
      }

      const data = await response.json();

      // Store quiz data in sessionStorage for the take page
      sessionStorage.setItem("quizData", JSON.stringify(data));

      router.push("/quiz/take");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--primary)]/10 mb-4">
          <span className="text-3xl" aria-hidden="true">🧠</span>
        </div>
        <h1 className="text-[var(--font-size-3xl)] font-bold text-[var(--foreground)] mb-3">
          AI Maturity Assessment
        </h1>
        <p className="text-[var(--font-size-base)] text-[var(--muted)] max-w-xl mx-auto">
          Discover your AI proficiency level and get personalized course recommendations
          tailored to your skill gaps.
        </p>
      </div>

      {/* Categories Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 mb-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-4">
          What this quiz assesses
        </h2>
        <div className="space-y-3">
          {categories.map((category) => (
            <div
              key={category.name}
              className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--background)]"
            >
              <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
                {category.icon}
              </span>
              <div>
                <p className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)]">
                  {category.name}
                </p>
                <p className="text-[var(--font-size-xs)] text-[var(--muted)]">
                  {category.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 mb-8 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-3">
          How it works
        </h2>
        <ul className="space-y-2 text-[var(--font-size-sm)] text-[var(--muted)]">
          <li className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[var(--font-size-xs)] font-medium flex-shrink-0">1</span>
            Answer 15–20 multiple-choice questions
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[var(--font-size-xs)] font-medium flex-shrink-0">2</span>
            Get your AI maturity level (Beginner → Expert)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[var(--font-size-xs)] font-medium flex-shrink-0">3</span>
            Receive personalized course recommendations
          </li>
        </ul>
        <p className="mt-3 text-[var(--font-size-xs)] text-[var(--muted)]">
          Takes approximately 5–10 minutes. You can retake the quiz at any time.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 rounded-[var(--radius-md)] bg-[var(--error)]/10 border border-[var(--error)]/20">
          <p className="text-[var(--font-size-sm)] text-[var(--error)]">{error}</p>
        </div>
      )}

      {/* Start Button */}
      <div className="text-center">
        <button
          onClick={handleStartQuiz}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-[var(--font-size-base)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] transition-all duration-[var(--transition-base)] disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Start the AI maturity quiz"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating Quiz...
            </>
          ) : (
            <>
              Start Quiz
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
