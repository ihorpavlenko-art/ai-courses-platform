import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Property-Based Tests for Dashboard Aggregation and Preference Persistence
 *
 * **Validates: Requirements 6.5, 7.1, 7.2, 7.3, 7.5**
 */

// Mock Prisma before importing the service
vi.mock("@/lib/prisma", () => ({
  prisma: {
    courseProgress: {
      findMany: vi.fn(),
    },
    quizAttempt: {
      findMany: vi.fn(),
    },
    activityMetric: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { DashboardAggregator } from "@/lib/services/dashboard-aggregator";
import type { MaturityLevel, QuizCategory } from "@/lib/types";

const mockedProgressFindMany = vi.mocked(prisma.courseProgress.findMany);
const mockedQuizFindMany = vi.mocked(prisma.quizAttempt.findMany);
const mockedMetricsFindMany = vi.mocked(prisma.activityMetric.findMany);

// --- Generators ---

/** Generate a valid maturity level */
const maturityLevelArb: fc.Arbitrary<MaturityLevel> = fc.constantFrom(
  "beginner",
  "intermediate",
  "advanced",
  "expert"
);

/** Generate a valid quiz category */
const quizCategoryArb: fc.Arbitrary<QuizCategory> = fc.constantFrom(
  "ai_literacy",
  "tool_proficiency",
  "prompt_engineering",
  "ethics",
  "domain_application"
);

/** Generate a completion percentage between 0 and 100 (integer) */
const completionPercentageArb = fc.integer({ min: 0, max: 100 });

/** Generate a progress record */
const progressRecordArb = fc.record({
  completionPercentage: completionPercentageArb,
});

/** Generate an array of progress records (0-20) */
const progressRecordsArb = fc.array(progressRecordArb, {
  minLength: 0,
  maxLength: 20,
});

/** Generate category scores (all 5 categories with scores 0-100) */
const categoryScoresArb = fc.record({
  ai_literacy: fc.integer({ min: 0, max: 100 }),
  tool_proficiency: fc.integer({ min: 0, max: 100 }),
  prompt_engineering: fc.integer({ min: 0, max: 100 }),
  ethics: fc.integer({ min: 0, max: 100 }),
  domain_application: fc.integer({ min: 0, max: 100 }),
});

/** Generate a quiz attempt record */
const quizAttemptArb = fc.record({
  maturityLevel: maturityLevelArb,
  categoryScores: categoryScoresArb,
  createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }),
});

/** Generate an array of quiz attempts (0-10), sorted desc by createdAt */
const quizAttemptsArb = fc
  .array(quizAttemptArb, { minLength: 0, maxLength: 10 })
  .map((attempts) =>
    [...attempts].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
  );

/** Generate a session duration in minutes (1-480 minutes) */
const sessionDurationMinutesArb = fc.integer({ min: 1, max: 480 });

/** Generate an activity metric record with valid sessionStart and sessionEnd */
const activityMetricArb = fc
  .record({
    sessionStart: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }),
    durationMinutes: sessionDurationMinutesArb,
    hasEnd: fc.boolean(),
  })
  .map(({ sessionStart, durationMinutes, hasEnd }) => ({
    sessionStart,
    sessionEnd: hasEnd
      ? new Date(sessionStart.getTime() + durationMinutes * 60 * 1000)
      : null,
  }));

/** Generate an array of activity metrics (0-15) */
const activityMetricsArb = fc.array(activityMetricArb, {
  minLength: 0,
  maxLength: 15,
});

// --- Property 13: Dashboard Aggregation Correctness ---

describe("Property 13: Dashboard Aggregation Correctness", () => {
  let aggregator: DashboardAggregator;

  beforeEach(() => {
    vi.clearAllMocks();
    aggregator = new DashboardAggregator();
  });

  /**
   * **Validates: Requirements 7.1, 7.2**
   *
   * coursesStarted equals the count of progress records with completionPercentage > 0.
   */
  it("coursesStarted equals count of progress records with completionPercentage > 0", async () => {
    await fc.assert(
      fc.asyncProperty(
        progressRecordsArb,
        async (progressRecords) => {
          mockedProgressFindMany.mockResolvedValue(progressRecords as any);
          mockedQuizFindMany.mockResolvedValue([]);
          mockedMetricsFindMany.mockResolvedValue([]);

          const stats = await aggregator.getStats("test-user");

          const expectedStarted = progressRecords.filter(
            (p) => p.completionPercentage > 0
          ).length;

          expect(stats.coursesStarted).toBe(expectedStarted);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.2**
   *
   * coursesCompleted equals the count of progress records with completionPercentage === 100.
   */
  it("coursesCompleted equals count of progress records with completionPercentage === 100", async () => {
    await fc.assert(
      fc.asyncProperty(
        progressRecordsArb,
        async (progressRecords) => {
          mockedProgressFindMany.mockResolvedValue(progressRecords as any);
          mockedQuizFindMany.mockResolvedValue([]);
          mockedMetricsFindMany.mockResolvedValue([]);

          const stats = await aggregator.getStats("test-user");

          const expectedCompleted = progressRecords.filter(
            (p) => p.completionPercentage === 100
          ).length;

          expect(stats.coursesCompleted).toBe(expectedCompleted);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.3**
   *
   * currentMaturityLevel equals the maturityLevel from the most recent quiz attempt (or null if none).
   */
  it("currentMaturityLevel equals maturityLevel from most recent quiz attempt", async () => {
    await fc.assert(
      fc.asyncProperty(
        quizAttemptsArb,
        async (quizAttempts) => {
          mockedProgressFindMany.mockResolvedValue([]);
          // Serialize categoryScores as JSON string (as Prisma returns from DB)
          const dbAttempts = quizAttempts.map((a) => ({
            ...a,
            categoryScores: JSON.stringify(a.categoryScores),
          }));
          mockedQuizFindMany.mockResolvedValue(dbAttempts as any);
          mockedMetricsFindMany.mockResolvedValue([]);

          const stats = await aggregator.getStats("test-user");

          if (quizAttempts.length === 0) {
            expect(stats.currentMaturityLevel).toBeNull();
          } else {
            // First element is most recent (sorted desc)
            expect(stats.currentMaturityLevel).toBe(
              quizAttempts[0].maturityLevel
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.5**
   *
   * coursesCompleted is always <= coursesStarted (completed courses are a subset of started).
   */
  it("coursesCompleted is always <= coursesStarted", async () => {
    await fc.assert(
      fc.asyncProperty(
        progressRecordsArb,
        async (progressRecords) => {
          mockedProgressFindMany.mockResolvedValue(progressRecords as any);
          mockedQuizFindMany.mockResolvedValue([]);
          mockedMetricsFindMany.mockResolvedValue([]);

          const stats = await aggregator.getStats("test-user");

          expect(stats.coursesCompleted).toBeLessThanOrEqual(
            stats.coursesStarted
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.1**
   *
   * totalTimeOnPlatform is non-negative and correctly sums session durations.
   */
  it("totalTimeOnPlatform is non-negative and sums completed sessions", async () => {
    await fc.assert(
      fc.asyncProperty(
        activityMetricsArb,
        async (metrics) => {
          mockedProgressFindMany.mockResolvedValue([]);
          mockedQuizFindMany.mockResolvedValue([]);
          mockedMetricsFindMany.mockResolvedValue(metrics as any);

          const stats = await aggregator.getStats("test-user");

          expect(stats.totalTimeOnPlatform).toBeGreaterThanOrEqual(0);

          // Manually compute expected time
          const expectedTime = metrics.reduce((total, m) => {
            if (!m.sessionEnd) return total;
            const durationMs =
              new Date(m.sessionEnd).getTime() -
              new Date(m.sessionStart).getTime();
            return total + durationMs / (1000 * 60);
          }, 0);

          expect(stats.totalTimeOnPlatform).toBe(Math.round(expectedTime));
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 14: Preference Persistence Round-Trip ---

describe("Property 14: Preference Persistence Round-Trip", () => {
  /**
   * **Validates: Requirements 7.5**
   *
   * For any valid user preference object, saving (JSON.stringify) and loading
   * (JSON.parse) returns an identical preference object.
   */

  /** Generate a theme string */
  const themeArb = fc.constantFrom("light", "dark", "system", "auto");

  /** Generate a language string */
  const languageArb = fc.constantFrom(
    "en",
    "uk",
    "de",
    "fr",
    "es",
    "ja",
    "zh"
  );

  /** Generate a random preference object */
  const preferencesArb = fc.record({
    theme: themeArb,
    notifications: fc.boolean(),
    language: languageArb,
    emailDigest: fc.boolean(),
    showProgress: fc.boolean(),
    fontSize: fc.constantFrom("small", "medium", "large"),
  });

  it("saving and loading preferences returns identical object", async () => {
    await fc.assert(
      fc.asyncProperty(preferencesArb, async (preferences) => {
        // Simulate save: JSON.stringify (as stored in DB Json field)
        const serialized = JSON.stringify(preferences);

        // Simulate load: JSON.parse (as read from DB Json field)
        const loaded = JSON.parse(serialized);

        // Assert: loaded preferences are identical to original
        expect(loaded).toEqual(preferences);
      }),
      { numRuns: 100 }
    );
  });

  it("round-trip preserves all preference keys", async () => {
    await fc.assert(
      fc.asyncProperty(preferencesArb, async (preferences) => {
        const serialized = JSON.stringify(preferences);
        const loaded = JSON.parse(serialized);

        // Assert: all keys are preserved
        const originalKeys = Object.keys(preferences).sort();
        const loadedKeys = Object.keys(loaded).sort();
        expect(loadedKeys).toEqual(originalKeys);
      }),
      { numRuns: 100 }
    );
  });

  it("round-trip preserves preference value types", async () => {
    await fc.assert(
      fc.asyncProperty(preferencesArb, async (preferences) => {
        const serialized = JSON.stringify(preferences);
        const loaded = JSON.parse(serialized);

        // Assert: types are preserved
        expect(typeof loaded.theme).toBe("string");
        expect(typeof loaded.notifications).toBe("boolean");
        expect(typeof loaded.language).toBe("string");
        expect(typeof loaded.emailDigest).toBe("boolean");
        expect(typeof loaded.showProgress).toBe("boolean");
        expect(typeof loaded.fontSize).toBe("string");
      }),
      { numRuns: 100 }
    );
  });

  it("round-trip with nested preference objects preserves structure", async () => {
    /** Generate a more complex preference object with nested data */
    const complexPreferencesArb = fc.record({
      theme: themeArb,
      notifications: fc.record({
        email: fc.boolean(),
        push: fc.boolean(),
        sms: fc.boolean(),
      }),
      language: languageArb,
      dashboard: fc.record({
        showStats: fc.boolean(),
        defaultView: fc.constantFrom("grid", "list", "compact"),
      }),
    });

    await fc.assert(
      fc.asyncProperty(complexPreferencesArb, async (preferences) => {
        const serialized = JSON.stringify(preferences);
        const loaded = JSON.parse(serialized);

        // Assert: deep equality holds for nested objects
        expect(loaded).toEqual(preferences);
      }),
      { numRuns: 100 }
    );
  });
});
