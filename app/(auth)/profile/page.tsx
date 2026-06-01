"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DashboardStats, NormalizedCourse, MaturityLevel } from "@/lib/types";

// --- Types ---

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string | null;
  registeredAt: string;
  lastLoginAt: string;
  preferences: UserPreferences;
}

interface UserPreferences {
  theme?: "light" | "dark";
  notifications?: boolean;
}

interface QuizHistoryItem {
  id: string;
  totalScore: number;
  maturityLevel: MaturityLevel;
  createdAt: string;
}

interface QuizHistoryResponse {
  attempts: QuizHistoryItem[];
}

interface RecommendationsResponse {
  recommendations: NormalizedCourse[];
}

// --- Skeleton Components ---

function ProfileInfoSkeleton() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--border)] animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 bg-[var(--border)] rounded animate-pulse" />
          <div className="h-4 w-56 bg-[var(--border)] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function QuizHistorySkeleton() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <div className="h-5 w-32 bg-[var(--border)] rounded animate-pulse mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--border)] rounded-[var(--radius-md)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <div className="h-5 w-36 bg-[var(--border)] rounded animate-pulse mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-[var(--border)] rounded-[var(--radius-md)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <div className="h-5 w-48 bg-[var(--border)] rounded animate-pulse mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-[var(--border)] rounded-[var(--radius-md)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function PreferencesSkeleton() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <div className="h-5 w-28 bg-[var(--border)] rounded animate-pulse mb-4" />
      <div className="space-y-4">
        <div className="h-10 bg-[var(--border)] rounded-[var(--radius-md)] animate-pulse" />
        <div className="h-10 bg-[var(--border)] rounded-[var(--radius-md)] animate-pulse" />
      </div>
    </div>
  );
}

// --- Helper ---

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Section Components ---

function ProfileInfoSection({ profile }: { profile: UserProfile }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={`${profile.name}'s avatar`}
            className="w-16 h-16 rounded-full"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xl font-semibold">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-[var(--font-size-xl)] font-semibold text-[var(--foreground)]">
            {profile.name}
          </h2>
          <p className="text-[var(--font-size-sm)] text-[var(--muted)]">
            {profile.email}
          </p>
          <p className="text-[var(--font-size-xs)] text-[var(--muted)] mt-1">
            Member since {formatDate(profile.registeredAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuizHistorySection({ attempts }: { attempts: QuizHistoryItem[] }) {
  if (attempts.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-4">
          Quiz History
        </h2>
        <p className="text-[var(--font-size-sm)] text-[var(--muted)]">
          No quiz attempts yet. Take the quiz to assess your AI maturity level.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-4">
        Quiz History
      </h2>
      <div className="space-y-3">
        {attempts.map((attempt) => (
          <div
            key={attempt.id}
            className="flex items-center justify-between p-3 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)]"
          >
            <div>
              <p className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)]">
                {formatDate(attempt.createdAt)}
              </p>
              <p className="text-[var(--font-size-xs)] text-[var(--muted)]">
                Level: {capitalizeFirst(attempt.maturityLevel)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[var(--font-size-lg)] font-bold text-[var(--primary)]">
                {Math.round(attempt.totalScore)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearningStatsSection({ stats }: { stats: DashboardStats }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-4">
        Learning Statistics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)]">
          <p className="text-[var(--font-size-2xl)] font-bold text-[var(--primary)]">
            {stats.coursesStarted}
          </p>
          <p className="text-[var(--font-size-xs)] text-[var(--muted)] mt-1">
            Courses Started
          </p>
        </div>
        <div className="text-center p-4 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)]">
          <p className="text-[var(--font-size-2xl)] font-bold text-[var(--success)]">
            {stats.coursesCompleted}
          </p>
          <p className="text-[var(--font-size-xs)] text-[var(--muted)] mt-1">
            Courses Completed
          </p>
        </div>
        <div className="text-center p-4 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)]">
          <p className="text-[var(--font-size-2xl)] font-bold text-[var(--accent)]">
            {formatTime(stats.totalTimeOnPlatform)}
          </p>
          <p className="text-[var(--font-size-xs)] text-[var(--muted)] mt-1">
            Time on Platform
          </p>
        </div>
      </div>
    </div>
  );
}

function RecommendationsSection({ recommendations }: { recommendations: NormalizedCourse[] }) {
  if (recommendations.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-4">
          Recommendations
        </h2>
        <p className="text-[var(--font-size-sm)] text-[var(--muted)]">
          Complete the quiz to get personalized course recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-4">
        Recommendations
      </h2>
      <div className="space-y-3">
        {recommendations.slice(0, 5).map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="flex items-center justify-between p-3 bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--card-hover)] transition-colors duration-[var(--transition-fast)]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)] truncate">
                {course.title}
              </p>
              <p className="text-[var(--font-size-xs)] text-[var(--muted)]">
                {capitalizeFirst(course.provider.replace("_", " "))} · {capitalizeFirst(course.difficultyLevel)} · {course.duration}
              </p>
            </div>
            <span className="text-[var(--muted)] ml-2" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PreferencesSection({
  preferences,
  onSave,
  isSaving,
}: {
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
  isSaving: boolean;
}) {
  const [theme, setTheme] = useState<"light" | "dark">(preferences.theme ?? "light");
  const [notifications, setNotifications] = useState(preferences.notifications ?? true);

  const hasChanges =
    theme !== (preferences.theme ?? "light") ||
    notifications !== (preferences.notifications ?? true);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--foreground)] mb-4">
        Preferences
      </h2>
      <div className="space-y-4">
        {/* Theme toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)]">
              Theme
            </p>
            <p className="text-[var(--font-size-xs)] text-[var(--muted)]">
              Choose between light and dark mode
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-[var(--transition-fast)] cursor-pointer ${
              theme === "dark" ? "bg-[var(--primary)]" : "bg-[var(--border)]"
            }`}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Dark mode"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-[var(--transition-fast)] ${
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Notifications toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[var(--font-size-sm)] font-medium text-[var(--foreground)]">
              Notifications
            </p>
            <p className="text-[var(--font-size-xs)] text-[var(--muted)]">
              Receive updates about new courses and recommendations
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotifications(!notifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-[var(--transition-fast)] cursor-pointer ${
              notifications ? "bg-[var(--primary)]" : "bg-[var(--border)]"
            }`}
            role="switch"
            aria-checked={notifications}
            aria-label="Notifications"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-[var(--transition-fast)] ${
                notifications ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Save button */}
        <button
          onClick={() => onSave({ theme, notifications })}
          disabled={!hasChanges || isSaving}
          className="mt-2 px-4 py-2 bg-[var(--primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-colors duration-[var(--transition-fast)] text-[var(--font-size-sm)] font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function ProfilePage() {
  const queryClient = useQueryClient();

  // Fetch profile
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  // Fetch quiz history
  const {
    data: quizHistory,
    isLoading: quizLoading,
    isError: quizError,
  } = useQuery<QuizHistoryResponse>({
    queryKey: ["quizHistory"],
    queryFn: async () => {
      const res = await fetch("/api/quiz/history");
      if (!res.ok) throw new Error("Failed to load quiz history");
      return res.json();
    },
  });

  // Fetch dashboard stats
  const {
    data: dashboardStats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard stats");
      return res.json();
    },
  });

  // Fetch recommendations
  const {
    data: recommendationsData,
    isLoading: recsLoading,
    isError: recsError,
  } = useQuery<RecommendationsResponse>({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/recommendations");
      if (!res.ok) throw new Error("Failed to load recommendations");
      return res.json();
    },
  });

  // Save preferences mutation
  const preferencesMutation = useMutation({
    mutationFn: async (prefs: UserPreferences) => {
      const res = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[var(--font-size-2xl)] font-bold text-[var(--foreground)]">
          Personal Cabinet
        </h1>
        <Link
          href="/quiz"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--primary-hover)] transition-colors duration-[var(--transition-fast)] text-[var(--font-size-sm)] font-medium"
        >
          Retake Quiz
        </Link>
      </div>

      <div className="space-y-6">
        {/* User Info */}
        {profileLoading ? (
          <ProfileInfoSkeleton />
        ) : profileError || !profile ? (
          <ErrorCard message="Failed to load profile information" />
        ) : (
          <ProfileInfoSection profile={profile} />
        )}

        {/* Quiz History */}
        {quizLoading ? (
          <QuizHistorySkeleton />
        ) : quizError ? (
          <ErrorCard message="Failed to load quiz history" />
        ) : (
          <QuizHistorySection attempts={quizHistory?.attempts ?? []} />
        )}

        {/* Learning Stats */}
        {statsLoading ? (
          <StatsSkeleton />
        ) : statsError || !dashboardStats ? (
          <ErrorCard message="Failed to load learning statistics" />
        ) : (
          <LearningStatsSection stats={dashboardStats} />
        )}

        {/* Recommendations */}
        {recsLoading ? (
          <RecommendationsSkeleton />
        ) : recsError ? (
          <ErrorCard message="Failed to load recommendations" />
        ) : (
          <RecommendationsSection
            recommendations={recommendationsData?.recommendations ?? []}
          />
        )}

        {/* Preferences */}
        {profileLoading ? (
          <PreferencesSkeleton />
        ) : profileError || !profile ? (
          <ErrorCard message="Failed to load preferences" />
        ) : (
          <PreferencesSection
            preferences={profile.preferences}
            onSave={(prefs) => preferencesMutation.mutate(prefs)}
            isSaving={preferencesMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
      <p className="text-[var(--font-size-sm)] text-[var(--error)]">{message}</p>
    </div>
  );
}
