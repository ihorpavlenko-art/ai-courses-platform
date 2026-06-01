"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

interface ProgressRecord {
  userId: string;
  courseId: string;
  courseTitle: string;
  sections: { sectionId: string; completed: boolean }[];
  completionPercentage: number;
  lastInteraction: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProgressCardSkeleton() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 w-48 bg-[var(--border)] rounded" />
        <div className="h-4 w-20 bg-[var(--border)] rounded" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-[var(--border)] rounded-full" />
        <div className="h-4 w-10 bg-[var(--border)] rounded" />
      </div>
    </div>
  );
}

function ProgressCard({ record }: { record: ProgressRecord }) {
  const percentage = Math.round(record.completionPercentage);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--transition-base)]">
      <div className="flex items-start justify-between mb-3">
        <Link
          href={`/courses/${record.courseId}`}
          className="text-[var(--font-size-base)] font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors duration-[var(--transition-fast)] line-clamp-1"
        >
          {record.courseTitle}
        </Link>
        <span className="text-[var(--font-size-xs)] text-[var(--muted)] whitespace-nowrap ml-3">
          {formatDate(record.lastInteraction)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-[var(--transition-slow)]"
            style={{
              width: `${Math.min(100, Math.max(0, percentage))}%`,
              backgroundColor:
                percentage === 100
                  ? "var(--success)"
                  : "var(--primary)",
            }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${record.courseTitle} progress`}
          />
        </div>
        <span className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)] min-w-[3rem] text-right">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const {
    data: progressRecords,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProgressRecord[]>({
    queryKey: ["progress"],
    queryFn: async () => {
      const res = await fetch("/api/progress");
      if (!res.ok) {
        throw new Error("Failed to load progress data");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)] mb-2">
          Progress
        </h1>
        <p className="text-[var(--font-size-sm)] text-[var(--muted)] mb-6">
          Track your learning journey across all courses
        </p>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProgressCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)] mb-2">
          Progress
        </h1>
        <p className="text-[var(--font-size-sm)] text-[var(--muted)] mb-6">
          Track your learning journey across all courses
        </p>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 text-center">
          <p className="text-[var(--error)] text-[var(--font-size-lg)] mb-2">
            Something went wrong
          </p>
          <p className="text-[var(--muted)] text-[var(--font-size-sm)] mb-4">
            {error instanceof Error
              ? error.message
              : "Failed to load progress data"}
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

  // Sort by last interaction date (most recent first)
  const sortedRecords = [...(progressRecords || [])].sort(
    (a, b) =>
      new Date(b.lastInteraction).getTime() -
      new Date(a.lastInteraction).getTime()
  );

  // Empty state
  if (sortedRecords.length === 0) {
    return (
      <div>
        <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)] mb-2">
          Progress
        </h1>
        <p className="text-[var(--font-size-sm)] text-[var(--muted)] mb-6">
          Track your learning journey across all courses
        </p>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center">
          <span className="text-5xl mb-4 block" aria-hidden="true">
            📈
          </span>
          <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-2">
            No courses started yet
          </h2>
          <p className="text-[var(--muted)] text-[var(--font-size-sm)] mb-6">
            Start learning by exploring our course catalog and marking sections
            as complete.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center px-5 py-2.5 bg-[var(--primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-colors duration-[var(--transition-fast)] text-[var(--font-size-sm)] font-medium"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)] mb-2">
        Progress
      </h1>
      <p className="text-[var(--font-size-sm)] text-[var(--muted)] mb-6">
        Track your learning journey across all courses
      </p>

      <div className="space-y-4">
        {sortedRecords.map((record) => (
          <ProgressCard key={record.courseId} record={record} />
        ))}
      </div>
    </div>
  );
}
