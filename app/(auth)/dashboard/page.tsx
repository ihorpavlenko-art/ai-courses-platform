"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardStats, QuizCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<QuizCategory, string> = {
  ai_literacy: "AI Literacy",
  tool_proficiency: "Tool Proficiency",
  prompt_engineering: "Prompt Engineering",
  ethics: "Ethics",
  domain_application: "Domain Application",
};

function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function StatCardSkeleton() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <div className="h-4 w-24 bg-[var(--border)] rounded animate-pulse mb-3" />
      <div className="h-8 w-16 bg-[var(--border)] rounded animate-pulse" />
    </div>
  );
}

function CategoryProgressSkeleton() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <div className="h-5 w-40 bg-[var(--border)] rounded animate-pulse mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 w-32 bg-[var(--border)] rounded animate-pulse mb-2" />
            <div className="h-3 w-full bg-[var(--border)] rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--transition-base)]">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        <span className="text-[var(--font-size-sm)] text-[var(--muted)] font-medium">
          {label}
        </span>
      </div>
      <p className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function CategoryProgressBar({
  category,
  score,
}: {
  category: QuizCategory;
  score: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)]">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="text-[var(--font-size-sm)] text-[var(--muted)]">
          {Math.round(score)}%
        </span>
      </div>
      <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--primary)] rounded-full transition-all duration-[var(--transition-slow)]"
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          role="progressbar"
          aria-valuenow={Math.round(score)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${CATEGORY_LABELS[category]} progress`}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        throw new Error("Failed to load dashboard data");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)] mb-6">
          Dashboard
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <CategoryProgressSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)] mb-6">
          Dashboard
        </h1>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 text-center">
          <p className="text-[var(--error)] text-[var(--font-size-lg)] mb-2">
            Something went wrong
          </p>
          <p className="text-[var(--muted)] text-[var(--font-size-sm)] mb-4">
            {error instanceof Error
              ? error.message
              : "Failed to load dashboard data"}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-colors duration-[var(--transition-fast)] text-[var(--font-size-sm)] font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const maturityLabel = stats.currentMaturityLevel
    ? stats.currentMaturityLevel.charAt(0).toUpperCase() +
      stats.currentMaturityLevel.slice(1)
    : "Not assessed";

  return (
    <div>
      <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)] mb-6">
        Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Courses Started"
          value={String(stats.coursesStarted)}
          icon="📖"
        />
        <StatCard
          label="Courses Completed"
          value={String(stats.coursesCompleted)}
          icon="✅"
        />
        <StatCard
          label="Time on Platform"
          value={formatTime(stats.totalTimeOnPlatform)}
          icon="⏱️"
        />
        <StatCard
          label="Maturity Level"
          value={maturityLabel}
          icon="🎯"
        />
      </div>

      {/* Category Progress */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-6">
          Category Progress
        </h2>
        <div className="space-y-4">
          {(Object.keys(CATEGORY_LABELS) as QuizCategory[]).map((category) => (
            <CategoryProgressBar
              key={category}
              category={category}
              score={stats.categoryProgress[category] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
