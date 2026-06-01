"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
}

interface CourseDetail {
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
  lastVerified: string;
  sections: CourseSection[];
}

interface ProgressSection {
  sectionId: string;
  completed: boolean;
}

interface CourseProgress {
  userId: string;
  courseId: string;
  sections: ProgressSection[];
  completionPercentage: number;
  lastInteraction: string;
}

interface ProgressUpdateResponse {
  completionPercentage: number;
  sections: ProgressSection[];
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
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors}`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link skeleton */}
      <div className="h-5 bg-[var(--border)] rounded w-32" />

      {/* Header skeleton */}
      <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] p-6 space-y-4">
        <div className="h-8 bg-[var(--border)] rounded w-3/4" />
        <div className="flex gap-3">
          <div className="h-6 bg-[var(--border)] rounded w-24" />
          <div className="h-6 bg-[var(--border)] rounded w-20" />
          <div className="h-6 bg-[var(--border)] rounded-full w-24" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-[var(--border)] rounded w-full" />
          <div className="h-4 bg-[var(--border)] rounded w-full" />
          <div className="h-4 bg-[var(--border)] rounded w-2/3" />
        </div>
        <div className="h-10 bg-[var(--border)] rounded w-40" />
      </div>

      {/* Syllabus skeleton */}
      <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] p-6 space-y-4">
        <div className="h-6 bg-[var(--border)] rounded w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 bg-[var(--border)] rounded" />
              <div className="h-4 bg-[var(--border)] rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const queryClient = useQueryClient();

  // Fetch course details
  const {
    data: course,
    isLoading: courseLoading,
    isError: courseError,
  } = useQuery<CourseDetail>({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) throw new Error("Failed to fetch course");
      return res.json();
    },
    enabled: !!courseId,
  });

  // Fetch user progress for all courses, then extract this course's progress
  const { data: allProgress } = useQuery<CourseProgress[]>({
    queryKey: ["progress"],
    queryFn: async () => {
      const res = await fetch("/api/progress");
      if (!res.ok) throw new Error("Failed to fetch progress");
      return res.json();
    },
  });

  const courseProgress = allProgress?.find((p) => p.courseId === courseId);

  // Mutation for toggling section completion
  const toggleSectionMutation = useMutation<
    ProgressUpdateResponse,
    Error,
    { sectionId: string; completed: boolean }
  >({
    mutationFn: async ({ sectionId, completed }) => {
      const res = await fetch(`/api/progress/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, completed }),
      });
      if (!res.ok) throw new Error("Failed to update progress");
      return res.json();
    },
    // Optimistic update
    onMutate: async ({ sectionId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["progress"] });

      const previousProgress = queryClient.getQueryData<CourseProgress[]>(["progress"]);

      queryClient.setQueryData<CourseProgress[]>(["progress"], (old) => {
        if (!old) {
          // Create a new progress entry if none exists
          const totalSections = course?.sections.length || 1;
          const completedCount = completed ? 1 : 0;
          return [
            {
              userId: "",
              courseId,
              sections: course?.sections.map((s) => ({
                sectionId: s.id,
                completed: s.id === sectionId ? completed : false,
              })) || [{ sectionId, completed }],
              completionPercentage: Math.round((completedCount / totalSections) * 100),
              lastInteraction: new Date().toISOString(),
            },
          ];
        }

        const existingIndex = old.findIndex((p) => p.courseId === courseId);

        if (existingIndex === -1) {
          // No progress record yet for this course
          const totalSections = course?.sections.length || 1;
          const completedCount = completed ? 1 : 0;
          return [
            ...old,
            {
              userId: "",
              courseId,
              sections: course?.sections.map((s) => ({
                sectionId: s.id,
                completed: s.id === sectionId ? completed : false,
              })) || [{ sectionId, completed }],
              completionPercentage: Math.round((completedCount / totalSections) * 100),
              lastInteraction: new Date().toISOString(),
            },
          ];
        }

        const updated = [...old];
        const record = { ...updated[existingIndex] };
        const sections = record.sections.map((s) =>
          s.sectionId === sectionId ? { ...s, completed } : s
        );

        // If section doesn't exist in the record yet, add it
        if (!sections.find((s) => s.sectionId === sectionId)) {
          sections.push({ sectionId, completed });
        }

        const totalSections = course?.sections.length || sections.length;
        const completedCount = sections.filter((s) => s.completed).length;

        record.sections = sections;
        record.completionPercentage = Math.round((completedCount / totalSections) * 100);
        record.lastInteraction = new Date().toISOString();
        updated[existingIndex] = record;

        return updated;
      });

      return { previousProgress };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context && typeof context === "object" && "previousProgress" in context) {
        queryClient.setQueryData(["progress"], (context as { previousProgress: CourseProgress[] }).previousProgress);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  // Helper to check if a section is completed
  const isSectionCompleted = (sectionId: string): boolean => {
    if (!courseProgress) return false;
    const section = courseProgress.sections.find((s) => s.sectionId === sectionId);
    return section?.completed ?? false;
  };

  // Calculate completion percentage
  const completionPercentage = courseProgress?.completionPercentage ?? 0;

  if (courseLoading) {
    return <CourseDetailSkeleton />;
  }

  if (courseError || !course) {
    return (
      <div className="space-y-6">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-[var(--font-size-sm)] text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          ← Back to Courses
        </Link>
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">😕</span>
          <p className="text-[var(--error)] text-[var(--font-size-sm)]">
            Failed to load course details. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1 text-[var(--font-size-sm)] text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
      >
        ← Back to Courses
      </Link>

      {/* Course Header */}
      <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] p-6">
        <div className="space-y-4">
          <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)]">
            {course.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[var(--font-size-sm)] text-[var(--muted)]">
              {course.provider}
            </span>
            <span className="text-[var(--border)]">•</span>
            <span className="text-[var(--font-size-sm)] text-[var(--muted)]">
              {course.duration}
            </span>
            <span className="text-[var(--border)]">•</span>
            <DifficultyBadge level={course.difficultyLevel} />
          </div>

          {/* Topics */}
          {course.topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {course.topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <p className="text-[var(--font-size-sm)] text-[var(--foreground)] leading-relaxed whitespace-pre-line">
            {course.description}
          </p>

          {/* External link */}
          <a
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-[var(--radius-md)] text-[var(--font-size-sm)] font-medium hover:bg-[var(--primary-hover)] transition-colors duration-[var(--transition-fast)]"
          >
            Go to Course
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Syllabus & Progress */}
      {course.sections.length > 0 && (
        <div className="bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)]">
              Syllabus
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--success)] rounded-full transition-all duration-[var(--transition-base)]"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-[var(--font-size-sm)] font-medium text-[var(--muted)]">
                {completionPercentage}%
              </span>
            </div>
          </div>

          <ul className="space-y-2" role="list">
            {course.sections.map((section) => {
              const completed = isSectionCompleted(section.id);
              return (
                <li key={section.id} className="flex items-center gap-3">
                  <label className="flex items-center gap-3 w-full cursor-pointer group py-2 px-3 rounded-[var(--radius-md)] hover:bg-[var(--background)] transition-colors duration-[var(--transition-fast)]">
                    <input
                      type="checkbox"
                      checked={completed}
                      onChange={(e) => {
                        toggleSectionMutation.mutate({
                          sectionId: section.id,
                          completed: e.target.checked,
                        });
                      }}
                      className="h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-2 cursor-pointer"
                      aria-label={`Mark "${section.title}" as ${completed ? "incomplete" : "complete"}`}
                    />
                    <span
                      className={`text-[var(--font-size-sm)] transition-colors ${
                        completed
                          ? "text-[var(--muted)] line-through"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {section.title}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
