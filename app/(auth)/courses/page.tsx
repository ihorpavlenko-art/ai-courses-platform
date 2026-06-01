"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

// Types matching the API response
interface Course {
  id: string;
  title: string;
  provider: string;
  description: string;
  url: string;
  duration: string;
  difficultyLevel: string;
  topics: string[];
  thumbnailUrl: string | null;
  isFree: boolean;
}

interface CourseListResponse {
  courses: Course[];
  total: number;
  page: number;
  pageSize: number;
}

interface ProgressRecord {
  courseId: string;
  completionPercentage: number;
}

const PROVIDERS = [
  { value: "", label: "All Providers" },
  { value: "coursera", label: "Coursera" },
  { value: "edx", label: "edX" },
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Microsoft" },
  { value: "deeplearning_ai", label: "DeepLearning.AI" },
];

const DIFFICULTIES = [
  { value: "", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function DifficultyBadge({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    advanced: "bg-red-100 text-red-800",
  };

  const colors = colorMap[level] || "bg-gray-100 text-gray-800";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function CourseTileSkeleton() {
  return (
    <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden animate-pulse">
      <div className="h-40 bg-[var(--border)]" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-[var(--border)] rounded w-3/4" />
        <div className="h-4 bg-[var(--border)] rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 bg-[var(--border)] rounded-full w-20" />
          <div className="h-5 bg-[var(--border)] rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}

function CourseTile({
  course,
  progress,
}: {
  course: Course;
  progress?: number;
}) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="block bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--transition-base)] group"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-[var(--border)] overflow-hidden">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={`${course.title} thumbnail`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[var(--transition-slow)]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white text-4xl">
            📚
          </div>
        )}
        {/* Progress indicator overlay */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--success)] rounded-full transition-all duration-[var(--transition-base)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-white text-xs font-medium">
                {progress}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-[var(--foreground)] text-[var(--font-size-sm)] line-clamp-2 mb-2 group-hover:text-[var(--primary)] transition-colors">
          {course.title}
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[var(--font-size-xs)] text-[var(--muted)]">
            {course.provider}
          </span>
          <span className="text-[var(--border)]">•</span>
          <span className="text-[var(--font-size-xs)] text-[var(--muted)]">
            {course.duration}
          </span>
        </div>

        <DifficultyBadge level={course.difficultyLevel} />
      </div>
    </Link>
  );
}

export default function CoursesPage() {
  const [provider, setProvider] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const debouncedSearch = useDebounce(searchInput, 300);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [provider, difficulty, debouncedSearch]);

  // Build query params
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (provider) params.set("provider", provider);
    if (difficulty) params.set("difficulty", difficulty);
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return params.toString();
  }, [provider, difficulty, debouncedSearch, page, pageSize]);

  // Fetch courses
  const {
    data: coursesData,
    isLoading: coursesLoading,
    isError: coursesError,
  } = useQuery<CourseListResponse>({
    queryKey: ["courses", provider, difficulty, debouncedSearch, page, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/courses?${buildQueryString()}`);
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  // Fetch user progress
  const { data: progressData } = useQuery<ProgressRecord[]>({
    queryKey: ["progress"],
    queryFn: async () => {
      const res = await fetch("/api/progress");
      if (!res.ok) throw new Error("Failed to fetch progress");
      return res.json();
    },
  });

  // Map progress by courseId for quick lookup
  const progressMap = new Map<string, number>();
  if (progressData) {
    for (const record of progressData) {
      progressMap.set(record.courseId, record.completionPercentage);
    }
  }

  const totalPages = coursesData
    ? Math.ceil(coursesData.total / pageSize)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)]">
          Course Catalog
        </h1>
        <p className="text-[var(--font-size-sm)] text-[var(--muted)] mt-1">
          Browse free AI courses from top providers
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4">
          <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] p-4 space-y-4">
            <h2 className="font-semibold text-[var(--foreground)] text-[var(--font-size-sm)]">
              Filters
            </h2>

            {/* Search */}
            <div>
              <label
                htmlFor="search-input"
                className="block text-[var(--font-size-xs)] font-medium text-[var(--muted)] mb-1"
              >
                Search
              </label>
              <input
                id="search-input"
                type="text"
                placeholder="Search courses..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-3 py-2 text-[var(--font-size-sm)] bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-[var(--transition-fast)]"
              />
            </div>

            {/* Provider Filter */}
            <div>
              <label
                htmlFor="provider-filter"
                className="block text-[var(--font-size-xs)] font-medium text-[var(--muted)] mb-1"
              >
                Provider
              </label>
              <select
                id="provider-filter"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 text-[var(--font-size-sm)] bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-[var(--transition-fast)]"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label
                htmlFor="difficulty-filter"
                className="block text-[var(--font-size-xs)] font-medium text-[var(--muted)] mb-1"
              >
                Difficulty
              </label>
              <select
                id="difficulty-filter"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 text-[var(--font-size-sm)] bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-[var(--transition-fast)]"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(provider || difficulty || searchInput) && (
              <button
                onClick={() => {
                  setProvider("");
                  setDifficulty("");
                  setSearchInput("");
                }}
                className="w-full px-3 py-2 text-[var(--font-size-sm)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--card-hover)] transition-colors duration-[var(--transition-fast)]"
              >
                Clear Filters
              </button>
            )}
          </div>
        </aside>

        {/* Course Grid */}
        <div className="flex-1">
          {/* Results count */}
          {coursesData && !coursesLoading && (
            <p className="text-[var(--font-size-sm)] text-[var(--muted)] mb-4">
              {coursesData.total} course{coursesData.total !== 1 ? "s" : ""}{" "}
              found
            </p>
          )}

          {/* Loading State */}
          {coursesLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <CourseTileSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {coursesError && (
            <div className="text-center py-12">
              <p className="text-[var(--error)] text-[var(--font-size-sm)]">
                Failed to load courses. Please try again.
              </p>
            </div>
          )}

          {/* Empty State */}
          {coursesData && coursesData.courses.length === 0 && !coursesLoading && (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-[var(--muted)] text-[var(--font-size-sm)]">
                No courses found matching your filters.
              </p>
              <button
                onClick={() => {
                  setProvider("");
                  setDifficulty("");
                  setSearchInput("");
                }}
                className="mt-3 text-[var(--primary)] hover:text-[var(--primary-hover)] text-[var(--font-size-sm)] font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Course Grid */}
          {coursesData && coursesData.courses.length > 0 && !coursesLoading && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {coursesData.courses.map((course) => (
                  <CourseTile
                    key={course.id}
                    course={course}
                    progress={progressMap.get(course.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 text-[var(--font-size-sm)] border border-[var(--border)] rounded-[var(--radius-md)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-hover)] transition-colors duration-[var(--transition-fast)]"
                    aria-label="Previous page"
                  >
                    ← Prev
                  </button>

                  <span className="px-3 py-2 text-[var(--font-size-sm)] text-[var(--muted)]">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-2 text-[var(--font-size-sm)] border border-[var(--border)] rounded-[var(--radius-md)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card-hover)] transition-colors duration-[var(--transition-fast)]"
                    aria-label="Next page"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
