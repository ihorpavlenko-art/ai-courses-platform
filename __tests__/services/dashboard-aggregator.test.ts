import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DashboardStats, MaturityLevel, QuizCategory } from "@/lib/types";

// Mock Prisma
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

const mockedProgressFindMany = vi.mocked(prisma.courseProgress.findMany);
const mockedQuizFindMany = vi.mocked(prisma.quizAttempt.findMany);
const mockedMetricsFindMany = vi.mocked(prisma.activityMetric.findMany);

describe("DashboardAggregator", () => {
  let aggregator: DashboardAggregator;

  beforeEach(() => {
    vi.clearAllMocks();
    aggregator = new DashboardAggregator();
  });

  it("returns default stats when user has no data", async () => {
    mockedProgressFindMany.mockResolvedValue([]);
    mockedQuizFindMany.mockResolvedValue([]);
    mockedMetricsFindMany.mockResolvedValue([]);

    const stats = await aggregator.getStats("user-1");

    expect(stats).toEqual({
      coursesStarted: 0,
      coursesCompleted: 0,
      totalTimeOnPlatform: 0,
      currentMaturityLevel: null,
      categoryProgress: {
        ai_literacy: 0,
        tool_proficiency: 0,
        prompt_engineering: 0,
        ethics: 0,
        domain_application: 0,
      },
    });
  });

  it("counts coursesStarted as progress records with completionPercentage > 0", async () => {
    mockedProgressFindMany.mockResolvedValue([
      { completionPercentage: 50 },
      { completionPercentage: 0 },
      { completionPercentage: 25 },
      { completionPercentage: 100 },
    ] as any);
    mockedQuizFindMany.mockResolvedValue([]);
    mockedMetricsFindMany.mockResolvedValue([]);

    const stats = await aggregator.getStats("user-1");

    // 3 courses have completionPercentage > 0 (50, 25, 100)
    expect(stats.coursesStarted).toBe(3);
  });

  it("counts coursesCompleted as progress records with completionPercentage === 100", async () => {
    mockedProgressFindMany.mockResolvedValue([
      { completionPercentage: 50 },
      { completionPercentage: 100 },
      { completionPercentage: 100 },
      { completionPercentage: 99 },
    ] as any);
    mockedQuizFindMany.mockResolvedValue([]);
    mockedMetricsFindMany.mockResolvedValue([]);

    const stats = await aggregator.getStats("user-1");

    expect(stats.coursesCompleted).toBe(2);
  });

  it("calculates totalTimeOnPlatform as sum of session durations in minutes", async () => {
    mockedProgressFindMany.mockResolvedValue([]);
    mockedQuizFindMany.mockResolvedValue([]);
    mockedMetricsFindMany.mockResolvedValue([
      {
        sessionStart: new Date("2024-01-01T10:00:00Z"),
        sessionEnd: new Date("2024-01-01T10:30:00Z"), // 30 minutes
      },
      {
        sessionStart: new Date("2024-01-02T14:00:00Z"),
        sessionEnd: new Date("2024-01-02T15:00:00Z"), // 60 minutes
      },
      {
        sessionStart: new Date("2024-01-03T09:00:00Z"),
        sessionEnd: null, // no end — should be skipped
      },
    ] as any);

    const stats = await aggregator.getStats("user-1");

    // 30 + 60 = 90 minutes
    expect(stats.totalTimeOnPlatform).toBe(90);
  });

  it("returns currentMaturityLevel from the most recent quiz attempt", async () => {
    mockedProgressFindMany.mockResolvedValue([]);
    mockedQuizFindMany.mockResolvedValue([
      {
        maturityLevel: "advanced",
        categoryScores: JSON.stringify({
          ai_literacy: 70,
          tool_proficiency: 60,
          prompt_engineering: 55,
          ethics: 80,
          domain_application: 65,
        }),
        createdAt: new Date("2024-02-01"),
      },
      {
        maturityLevel: "beginner",
        categoryScores: JSON.stringify({
          ai_literacy: 20,
          tool_proficiency: 15,
          prompt_engineering: 10,
          ethics: 25,
          domain_application: 18,
        }),
        createdAt: new Date("2024-01-01"),
      },
    ] as any);
    mockedMetricsFindMany.mockResolvedValue([]);

    const stats = await aggregator.getStats("user-1");

    // Most recent (first in desc order) is "advanced"
    expect(stats.currentMaturityLevel).toBe("advanced");
    expect(stats.categoryProgress).toEqual({
      ai_literacy: 70,
      tool_proficiency: 60,
      prompt_engineering: 55,
      ethics: 80,
      domain_application: 65,
    });
  });

  it("fetches all three data sources in parallel", async () => {
    mockedProgressFindMany.mockResolvedValue([]);
    mockedQuizFindMany.mockResolvedValue([]);
    mockedMetricsFindMany.mockResolvedValue([]);

    await aggregator.getStats("user-1");

    // All three should be called with the same userId
    expect(mockedProgressFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mockedQuizFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
    expect(mockedMetricsFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });
});
