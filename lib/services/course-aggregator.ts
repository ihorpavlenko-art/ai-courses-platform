import type { NormalizedCourse, CourseProvider } from "@/lib/types";
import type { ProviderAdapter } from "./adapters";
import {
  CourseraAdapter,
  EdxAdapter,
  GoogleAdapter,
  MicrosoftAdapter,
  DeepLearningAiAdapter,
} from "./adapters";
import { prisma } from "@/lib/prisma";

const logger = {
  error: (message: string, error?: unknown) => {
    console.error(`[CourseAggregator] ${message}`, error);
  },
  info: (message: string) => {
    console.log(`[CourseAggregator] ${message}`);
  },
};

export class CourseAggregator {
  private providers: Map<CourseProvider, ProviderAdapter>;

  constructor(providers?: Map<CourseProvider, ProviderAdapter>) {
    this.providers =
      providers ??
      new Map<CourseProvider, ProviderAdapter>([
        ["coursera", new CourseraAdapter()],
        ["edx", new EdxAdapter()],
        ["google", new GoogleAdapter()],
        ["microsoft", new MicrosoftAdapter()],
        ["deeplearning_ai", new DeepLearningAiAdapter()],
      ]);
  }

  async fetchAll(): Promise<NormalizedCourse[]> {
    const results = await Promise.allSettled(
      Array.from(this.providers.entries()).map(([name, adapter]) =>
        this.fetchFromProvider(name, adapter)
      )
    );
    return this.mergeResults(results);
  }

  private async fetchFromProvider(
    name: CourseProvider,
    adapter: ProviderAdapter
  ): Promise<NormalizedCourse[]> {
    try {
      const raw = await adapter.fetch();
      return raw.map((r) => adapter.normalize(r)).filter((c) => c.isFree);
    } catch (error) {
      logger.error(`Failed to fetch from ${name}`, error);
      return this.getCachedCourses(name);
    }
  }

  private async getCachedCourses(
    provider: CourseProvider
  ): Promise<NormalizedCourse[]> {
    try {
      const cachedCourses = await prisma.course.findMany({
        where: { provider, isFree: true },
      });

      return cachedCourses.map((course) => ({
        id: course.id,
        externalId: course.externalId,
        title: course.title,
        provider: course.provider as CourseProvider,
        description: course.description,
        url: course.url,
        duration: course.duration,
        difficultyLevel: course.difficultyLevel as NormalizedCourse["difficultyLevel"],
        topics: JSON.parse(course.topics) as string[],
        thumbnailUrl: course.thumbnailUrl ?? "",
        isFree: course.isFree,
        lastVerified: course.lastVerified,
      }));
    } catch (cacheError) {
      logger.error(
        `Failed to retrieve cached courses for ${provider}`,
        cacheError
      );
      return [];
    }
  }

  private mergeResults(
    results: PromiseSettledResult<NormalizedCourse[]>[]
  ): NormalizedCourse[] {
    const courses: NormalizedCourse[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        courses.push(...result.value);
      }
      // Rejected promises are already handled in fetchFromProvider,
      // but if allSettled itself rejects (shouldn't happen), we skip.
    }

    return courses;
  }
}

/** Singleton instance for convenience */
export const courseAggregator = new CourseAggregator();
