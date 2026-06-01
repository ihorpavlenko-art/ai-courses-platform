import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import type { NormalizedCourse, CourseProvider, DifficultyLevel } from "@/lib/types";
import type { ProviderAdapter, RawCourseData } from "@/lib/services/adapters/provider-adapter";
import {
  CourseraAdapter,
  EdxAdapter,
  GoogleAdapter,
  MicrosoftAdapter,
  DeepLearningAiAdapter,
} from "@/lib/services/adapters";
import { CourseAggregator } from "@/lib/services/course-aggregator";

/**
 * Property-Based Tests for Course Aggregation
 *
 * **Validates: Requirements 3.2, 3.4, 3.5**
 */

// --- Constants ---

const VALID_PROVIDERS: CourseProvider[] = [
  "coursera",
  "edx",
  "google",
  "microsoft",
  "deeplearning_ai",
];

const VALID_DIFFICULTY_LEVELS: DifficultyLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

// --- Generators ---

/** Generate a raw Coursera course payload */
const courseraRawArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 30 }),
  slug: fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.replace(/\s/g, "-")),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
  photoUrl: fc.webUrl(),
  workload: fc.nat({ max: 200 }).map((h) => `${h + 1} hours`),
  level: fc.oneof(fc.constant("Beginner"), fc.constant("Intermediate"), fc.constant("Advanced")),
  domainTypes: fc
    .array(
      fc.record({
        domainId: fc.string({ minLength: 1, maxLength: 30 }),
        subdomainId: fc.string({ minLength: 1, maxLength: 30 }),
      }),
      { minLength: 1, maxLength: 5 }
    ),
  partnerIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
});

/** Generate a raw edX course payload */
const edxRawArb = fc.record({
  key: fc.string({ minLength: 1, maxLength: 30 }),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  short_description: fc.string({ minLength: 1, maxLength: 300 }).filter((s) => s.trim().length > 0),
  full_description: fc.string({ minLength: 1, maxLength: 500 }),
  image: fc.record({ src: fc.webUrl() }),
  effort: fc.nat({ max: 200 }).map((h) => `${h + 1} hours`),
  level_type: fc.oneof(fc.constant("Introductory"), fc.constant("Intermediate"), fc.constant("Advanced")),
  subjects: fc.array(
    fc.record({ name: fc.string({ minLength: 1, maxLength: 30 }) }),
    { minLength: 1, maxLength: 5 }
  ),
  marketing_url: fc.webUrl(),
});

/** Generate a raw Google course payload */
const googleRawArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 30 }),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  summary: fc.string({ minLength: 1, maxLength: 300 }).filter((s) => s.trim().length > 0),
  duration_minutes: fc.integer({ min: 1, max: 600 }),
  skill_level: fc.oneof(fc.constant("introductory"), fc.constant("intermediate"), fc.constant("advanced")),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
  image_url: fc.webUrl(),
  url: fc.webUrl(),
});

/** Generate a raw Microsoft course payload */
const microsoftRawArb = fc.record({
  uid: fc.string({ minLength: 1, maxLength: 30 }),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  summary: fc.string({ minLength: 1, maxLength: 300 }).filter((s) => s.trim().length > 0),
  duration_in_minutes: fc.integer({ min: 1, max: 600 }),
  levels: fc.array(
    fc.oneof(fc.constant("beginner"), fc.constant("intermediate"), fc.constant("advanced")),
    { minLength: 1, maxLength: 3 }
  ),
  products: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
  roles: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
  icon_url: fc.webUrl(),
  url: fc.webUrl(),
});

/** Generate a raw DeepLearning.AI course payload */
const deeplearningAiRawArb = fc.record({
  slug: fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.replace(/\s/g, "-")),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
  estimated_hours: fc.integer({ min: 1, max: 100 }),
  difficulty: fc.oneof(fc.constant("Beginner"), fc.constant("Intermediate"), fc.constant("Advanced")),
  skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
  thumbnail: fc.webUrl(),
  instructors: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 3 }),
});

/** Generate a NormalizedCourse with random isFree values */
const normalizedCourseArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 30 }),
  externalId: fc.string({ minLength: 1, maxLength: 30 }),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  provider: fc.constantFrom(...VALID_PROVIDERS),
  description: fc.string({ minLength: 1, maxLength: 300 }).filter((s) => s.trim().length > 0),
  url: fc.webUrl(),
  duration: fc.string({ minLength: 1, maxLength: 30 }),
  difficultyLevel: fc.constantFrom(...VALID_DIFFICULTY_LEVELS),
  topics: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
  thumbnailUrl: fc.webUrl(),
  isFree: fc.boolean(),
  lastVerified: fc.date(),
});

// --- Property 3: Course Normalization Completeness ---

describe("Property 3: Course Normalization Completeness", () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * For any raw course data from any supported provider, the normalization function
   * SHALL produce a NormalizedCourse object containing all required fields
   * (title, provider, description, url, duration, difficultyLevel, topics, thumbnailUrl).
   */

  it("Coursera adapter normalization produces all required fields", () => {
    const adapter = new CourseraAdapter();

    fc.assert(
      fc.property(courseraRawArb, (rawCourse) => {
        const rawData: RawCourseData = {
          provider: "coursera",
          rawPayload: rawCourse,
        };

        const normalized = adapter.normalize(rawData);

        // All required fields are present and non-empty
        expect(normalized.title).toBeTruthy();
        expect(normalized.provider).toBeTruthy();
        expect(normalized.description).toBeTruthy();
        expect(normalized.url).toBeTruthy();
        expect(normalized.duration).toBeTruthy();
        expect(normalized.difficultyLevel).toBeTruthy();
        expect(normalized.topics).toBeDefined();
        expect(normalized.topics.length).toBeGreaterThan(0);
        expect(normalized.thumbnailUrl).toBeTruthy();

        // Provider is a valid CourseProvider value
        expect(VALID_PROVIDERS).toContain(normalized.provider);

        // DifficultyLevel is one of the valid values
        expect(VALID_DIFFICULTY_LEVELS).toContain(normalized.difficultyLevel);
      }),
      { numRuns: 100 }
    );
  });

  it("edX adapter normalization produces all required fields", () => {
    const adapter = new EdxAdapter();

    fc.assert(
      fc.property(edxRawArb, (rawCourse) => {
        const rawData: RawCourseData = {
          provider: "edx",
          rawPayload: rawCourse,
        };

        const normalized = adapter.normalize(rawData);

        expect(normalized.title).toBeTruthy();
        expect(normalized.provider).toBeTruthy();
        expect(normalized.description).toBeTruthy();
        expect(normalized.url).toBeTruthy();
        expect(normalized.duration).toBeTruthy();
        expect(normalized.difficultyLevel).toBeTruthy();
        expect(normalized.topics).toBeDefined();
        expect(normalized.topics.length).toBeGreaterThan(0);
        expect(normalized.thumbnailUrl).toBeTruthy();

        expect(VALID_PROVIDERS).toContain(normalized.provider);
        expect(VALID_DIFFICULTY_LEVELS).toContain(normalized.difficultyLevel);
      }),
      { numRuns: 100 }
    );
  });

  it("Google adapter normalization produces all required fields", () => {
    const adapter = new GoogleAdapter();

    fc.assert(
      fc.property(googleRawArb, (rawCourse) => {
        const rawData: RawCourseData = {
          provider: "google",
          rawPayload: rawCourse,
        };

        const normalized = adapter.normalize(rawData);

        expect(normalized.title).toBeTruthy();
        expect(normalized.provider).toBeTruthy();
        expect(normalized.description).toBeTruthy();
        expect(normalized.url).toBeTruthy();
        expect(normalized.duration).toBeTruthy();
        expect(normalized.difficultyLevel).toBeTruthy();
        expect(normalized.topics).toBeDefined();
        expect(normalized.topics.length).toBeGreaterThan(0);
        expect(normalized.thumbnailUrl).toBeTruthy();

        expect(VALID_PROVIDERS).toContain(normalized.provider);
        expect(VALID_DIFFICULTY_LEVELS).toContain(normalized.difficultyLevel);
      }),
      { numRuns: 100 }
    );
  });

  it("Microsoft adapter normalization produces all required fields", () => {
    const adapter = new MicrosoftAdapter();

    fc.assert(
      fc.property(microsoftRawArb, (rawCourse) => {
        const rawData: RawCourseData = {
          provider: "microsoft",
          rawPayload: rawCourse,
        };

        const normalized = adapter.normalize(rawData);

        expect(normalized.title).toBeTruthy();
        expect(normalized.provider).toBeTruthy();
        expect(normalized.description).toBeTruthy();
        expect(normalized.url).toBeTruthy();
        expect(normalized.duration).toBeTruthy();
        expect(normalized.difficultyLevel).toBeTruthy();
        expect(normalized.topics).toBeDefined();
        expect(normalized.topics.length).toBeGreaterThan(0);
        expect(normalized.thumbnailUrl).toBeTruthy();

        expect(VALID_PROVIDERS).toContain(normalized.provider);
        expect(VALID_DIFFICULTY_LEVELS).toContain(normalized.difficultyLevel);
      }),
      { numRuns: 100 }
    );
  });

  it("DeepLearning.AI adapter normalization produces all required fields", () => {
    const adapter = new DeepLearningAiAdapter();

    fc.assert(
      fc.property(deeplearningAiRawArb, (rawCourse) => {
        const rawData: RawCourseData = {
          provider: "deeplearning_ai",
          rawPayload: rawCourse,
        };

        const normalized = adapter.normalize(rawData);

        expect(normalized.title).toBeTruthy();
        expect(normalized.provider).toBeTruthy();
        expect(normalized.description).toBeTruthy();
        expect(normalized.url).toBeTruthy();
        expect(normalized.duration).toBeTruthy();
        expect(normalized.difficultyLevel).toBeTruthy();
        expect(normalized.topics).toBeDefined();
        expect(normalized.topics.length).toBeGreaterThan(0);
        expect(normalized.thumbnailUrl).toBeTruthy();

        expect(VALID_PROVIDERS).toContain(normalized.provider);
        expect(VALID_DIFFICULTY_LEVELS).toContain(normalized.difficultyLevel);
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 4: Aggregation Failure Resilience ---

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
const mockedPrismaFindMany = vi.mocked(prisma.course.findMany);

describe("Property 4: Aggregation Failure Resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * For any provider and any failure scenario during fetching, the Course_Catalog
   * SHALL retain all previously stored courses for that provider — the count of
   * courses from a failed provider after a failed fetch SHALL be greater than or
   * equal to the count before the fetch.
   */
  it("failed fetch retains previously stored courses via cache fallback", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(normalizedCourseArb.map((c) => ({ ...c, isFree: true })), {
          minLength: 0,
          maxLength: 10,
        }),
        fc.constantFrom(...VALID_PROVIDERS),
        async (cachedCourses, provider) => {
          // Create a failing adapter
          const failingAdapter: ProviderAdapter = {
            async fetch(): Promise<RawCourseData[]> {
              throw new Error("Network failure");
            },
            normalize(_raw: RawCourseData): NormalizedCourse {
              throw new Error("Should not be called");
            },
          };

          // Set up the providers map with only the failing adapter
          const providers = new Map<CourseProvider, ProviderAdapter>([
            [provider, failingAdapter],
          ]);

          // Mock Prisma to return cached courses for this provider
          const dbCourses = cachedCourses.map((c) => ({
            id: c.id,
            externalId: c.externalId,
            title: c.title,
            provider: provider,
            description: c.description,
            url: c.url,
            duration: c.duration,
            difficultyLevel: c.difficultyLevel,
            topics: JSON.stringify(c.topics),
            thumbnailUrl: c.thumbnailUrl,
            isFree: true,
            lastVerified: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          mockedPrismaFindMany.mockResolvedValue(dbCourses as any);

          // Create aggregator with the failing provider
          const aggregator = new CourseAggregator(providers);

          // Fetch should not throw — graceful degradation
          const result = await aggregator.fetchAll();

          // Assert: result count >= 0 (no crash)
          expect(result.length).toBeGreaterThanOrEqual(0);

          // Assert: result count equals cached courses count (fallback works)
          expect(result.length).toBe(cachedCourses.length);

          // Assert: Prisma was called to retrieve cached courses
          expect(mockedPrismaFindMany).toHaveBeenCalledWith({
            where: { provider, isFree: true },
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 5: Free Course Invariant ---

describe("Property 5: Free Course Invariant", () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * For any course present in the Course_Catalog, the isFree field SHALL be true.
   * No paid course SHALL exist in the catalog after aggregation.
   */
  it("no paid course exists in catalog after aggregation filtering", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(normalizedCourseArb, { minLength: 1, maxLength: 20 }),
        async (courses) => {
          // Create a mock adapter that returns courses with mixed isFree values
          const mockAdapter: ProviderAdapter = {
            async fetch(): Promise<RawCourseData[]> {
              return courses.map((c) => ({
                provider: "coursera",
                rawPayload: c,
              }));
            },
            normalize(raw: RawCourseData): NormalizedCourse {
              // Return the course as-is (with its random isFree value)
              return raw.rawPayload as NormalizedCourse;
            },
          };

          const providers = new Map<CourseProvider, ProviderAdapter>([
            ["coursera", mockAdapter],
          ]);

          // Mock Prisma (won't be called since fetch succeeds)
          mockedPrismaFindMany.mockResolvedValue([]);

          const aggregator = new CourseAggregator(providers);
          const result = await aggregator.fetchAll();

          // Assert: every course in the output has isFree === true
          for (const course of result) {
            expect(course.isFree).toBe(true);
          }

          // Assert: the count of free courses in input matches output count
          const expectedFreeCount = courses.filter((c) => c.isFree).length;
          expect(result.length).toBe(expectedFreeCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
