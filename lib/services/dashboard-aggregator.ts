import { prisma } from "@/lib/prisma";
import type {
  DashboardStats,
  MaturityLevel,
  QuizCategory,
} from "@/lib/types";

/**
 * DashboardAggregator service computes aggregated dashboard statistics
 * for a user by combining course progress, quiz attempts, and activity metrics.
 */
export class DashboardAggregator {
  /**
   * Get aggregated dashboard stats for a user.
   * Fetches progress records, quiz attempts, and activity metrics in parallel,
   * then aggregates them into a single DashboardStats object.
   */
  async getStats(userId: string): Promise<DashboardStats> {
    const [progress, quizAttempts, metrics] = await Promise.all([
      this.getProgressRecords(userId),
      this.getQuizAttempts(userId),
      this.getActivityMetrics(userId),
    ]);
    return this.aggregate(progress, quizAttempts, metrics);
  }

  /**
   * Fetch all CourseProgress records for a user.
   */
  private async getProgressRecords(userId: string) {
    return prisma.courseProgress.findMany({
      where: { userId },
    });
  }

  /**
   * Fetch all QuizAttempt records for a user, ordered by most recent first.
   */
  private async getQuizAttempts(userId: string) {
    return prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Fetch all ActivityMetric records for a user.
   */
  private async getActivityMetrics(userId: string) {
    return prisma.activityMetric.findMany({
      where: { userId },
    });
  }

  /**
   * Aggregate raw data into DashboardStats.
   *
   * - coursesStarted: count of progress records with completionPercentage > 0
   * - coursesCompleted: count of progress records with completionPercentage === 100
   * - totalTimeOnPlatform: sum of session durations (sessionEnd - sessionStart) in minutes
   * - currentMaturityLevel: maturityLevel from the most recent quiz attempt (or null)
   * - categoryProgress: categoryScores from the most recent quiz attempt (or all zeros)
   */
  private aggregate(
    progress: { completionPercentage: number }[],
    quizAttempts: { maturityLevel: string; categoryScores: string; createdAt: Date }[],
    metrics: { sessionStart: Date; sessionEnd: Date | null }[]
  ): DashboardStats {
    // coursesStarted: courses with at least one completed section (completionPercentage > 0)
    const coursesStarted = progress.filter(
      (p) => p.completionPercentage > 0
    ).length;

    // coursesCompleted: courses at 100% completion
    const coursesCompleted = progress.filter(
      (p) => p.completionPercentage === 100
    ).length;

    // totalTimeOnPlatform: sum of session durations in minutes
    const totalTimeOnPlatform = metrics.reduce((total, metric) => {
      if (!metric.sessionEnd) return total;
      const durationMs =
        new Date(metric.sessionEnd).getTime() -
        new Date(metric.sessionStart).getTime();
      const durationMinutes = durationMs / (1000 * 60);
      return total + durationMinutes;
    }, 0);

    // Most recent quiz attempt (already sorted desc by createdAt)
    const latestAttempt = quizAttempts.length > 0 ? quizAttempts[0] : null;

    // currentMaturityLevel from most recent attempt
    const currentMaturityLevel: MaturityLevel | null = latestAttempt
      ? (latestAttempt.maturityLevel as MaturityLevel)
      : null;

    // categoryProgress from most recent attempt's categoryScores
    const defaultCategoryProgress: Record<QuizCategory, number> = {
      ai_literacy: 0,
      tool_proficiency: 0,
      prompt_engineering: 0,
      ethics: 0,
      domain_application: 0,
    };

    let categoryProgress: Record<QuizCategory, number>;
    if (latestAttempt) {
      const parsed = JSON.parse(latestAttempt.categoryScores);
      categoryProgress = {
        ai_literacy: parsed.ai_literacy ?? 0,
        tool_proficiency: parsed.tool_proficiency ?? 0,
        prompt_engineering: parsed.prompt_engineering ?? 0,
        ethics: parsed.ethics ?? 0,
        domain_application: parsed.domain_application ?? 0,
      };
    } else {
      categoryProgress = defaultCategoryProgress;
    }

    return {
      coursesStarted,
      coursesCompleted,
      totalTimeOnPlatform: Math.round(totalTimeOnPlatform),
      currentMaturityLevel,
      categoryProgress,
    };
  }
}

// Export singleton instance
export const dashboardAggregator = new DashboardAggregator();
