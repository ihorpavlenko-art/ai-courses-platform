import { NextRequest, NextResponse } from "next/server";
import { courseAggregator } from "@/lib/services/course-aggregator";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import type { NormalizedCourse, CourseProvider } from "@/lib/types";

const logger = {
  info: (message: string, meta?: unknown) => {
    console.log(`[CronAggregate] ${message}`, meta ?? "");
  },
  error: (message: string, error?: unknown) => {
    console.error(`[CronAggregate] ${message}`, error ?? "");
  },
};

export const POST = withErrorHandling(async (request: Request) => {
  // Defense-in-depth: secondary cron secret validation
  // (middleware already validates, but we check again as a safeguard)
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }

  const providerStats: Record<string, { count: number; status: string }> = {};
  let totalProcessed = 0;

  logger.info("Starting course aggregation");

  const courses = await courseAggregator.fetchAll();

  // Group courses by provider for per-provider logging
  const coursesByProvider = new Map<string, NormalizedCourse[]>();
  for (const course of courses) {
    const existing = coursesByProvider.get(course.provider) ?? [];
    existing.push(course);
    coursesByProvider.set(course.provider, existing);
  }

  // Upsert each course in the database
  for (const [provider, providerCourses] of coursesByProvider) {
    try {
      let upsertedCount = 0;

      for (const course of providerCourses) {
        await prisma.course.upsert({
          where: {
            provider_externalId: {
              provider: course.provider,
              externalId: course.externalId,
            },
          },
          create: {
            externalId: course.externalId,
            title: course.title,
            provider: course.provider,
            description: course.description,
            url: course.url,
            duration: course.duration,
            difficultyLevel: course.difficultyLevel,
            topics: JSON.stringify(course.topics),
            thumbnailUrl: course.thumbnailUrl || null,
            isFree: course.isFree,
            lastVerified: course.lastVerified,
          },
          update: {
            title: course.title,
            description: course.description,
            url: course.url,
            duration: course.duration,
            difficultyLevel: course.difficultyLevel,
            topics: JSON.stringify(course.topics),
            thumbnailUrl: course.thumbnailUrl || null,
            isFree: course.isFree,
            lastVerified: course.lastVerified,
          },
        });
        upsertedCount++;
      }

      providerStats[provider] = { count: upsertedCount, status: "success" };
      totalProcessed += upsertedCount;
      logger.info(`Provider ${provider}: ${upsertedCount} courses upserted`);
    } catch (providerError) {
      providerStats[provider] = {
        count: 0,
        status: "failed",
      };
      logger.error(`Failed to upsert courses for provider ${provider}`, providerError);
    }
  }

  // Log providers that returned no courses (may indicate fetch failure handled by aggregator)
  const allProviders: CourseProvider[] = [
    "coursera",
    "edx",
    "google",
    "microsoft",
    "deeplearning_ai",
  ];
  for (const provider of allProviders) {
    if (!providerStats[provider]) {
      providerStats[provider] = { count: 0, status: "no_data" };
    }
  }

  logger.info(`Aggregation complete: ${totalProcessed} courses processed`);

  return NextResponse.json({
    success: true,
    coursesProcessed: totalProcessed,
    providers: providerStats,
  });
});
