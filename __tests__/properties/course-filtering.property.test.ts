import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { CourseProvider, DifficultyLevel } from "@/lib/types";

/**
 * Property-Based Tests for Course Filtering
 *
 * **Validates: Requirements 4.4, 4.5**
 *
 * Tests the filtering logic that the /api/courses route uses.
 * Since we can't easily test the actual Prisma query in a property test,
 * we implement the filtering logic as a pure function and test that.
 */

// --- Types ---

interface CourseRecord {
  id: string;
  title: string;
  provider: CourseProvider;
  description: string;
  difficultyLevel: DifficultyLevel;
  topics: string[]; // stored as JSON string in DB, parsed here
}

interface FilterCriteria {
  provider?: CourseProvider;
  difficulty?: DifficultyLevel;
  topic?: string;
  search?: string;
}

// --- Pure filtering function (mirrors API route logic) ---

/**
 * Filters courses using the same logic as the API route's Prisma where clause:
 * - provider: exact match
 * - difficulty: exact match on difficultyLevel
 * - topic: course topics array contains the topic string (case-insensitive substring match)
 * - search: title OR description contains the search string (case-insensitive)
 */
function filterCourses(
  courses: CourseRecord[],
  filters: FilterCriteria
): CourseRecord[] {
  return courses.filter((course) => {
    // Provider: exact match
    if (filters.provider && course.provider !== filters.provider) {
      return false;
    }

    // Difficulty: exact match
    if (filters.difficulty && course.difficultyLevel !== filters.difficulty) {
      return false;
    }

    // Topic: case-insensitive substring match against topics array
    // Mirrors Prisma `contains` on the JSON string representation
    if (filters.topic) {
      const topicLower = filters.topic.toLowerCase();
      const hasMatchingTopic = course.topics.some((t) =>
        t.toLowerCase().includes(topicLower)
      );
      if (!hasMatchingTopic) {
        return false;
      }
    }

    // Search: case-insensitive substring match on title OR description
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const titleMatch = course.title.toLowerCase().includes(searchLower);
      const descMatch = course.description.toLowerCase().includes(searchLower);
      if (!titleMatch && !descMatch) {
        return false;
      }
    }

    return true;
  });
}

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

const SAMPLE_TOPICS = [
  "machine learning",
  "deep learning",
  "natural language processing",
  "computer vision",
  "reinforcement learning",
  "generative ai",
  "prompt engineering",
  "ai ethics",
  "neural networks",
  "data science",
];

// --- Generators ---

const courseRecordArb: fc.Arbitrary<CourseRecord> = fc.record({
  id: fc.uuid(),
  title: fc
    .array(fc.constantFrom("Introduction to", "Advanced", "Fundamentals of", "Mastering", "Applied"), { minLength: 1, maxLength: 1 })
    .chain((prefix) =>
      fc.constantFrom(...SAMPLE_TOPICS).map((topic) => `${prefix[0]} ${topic}`)
    ),
  provider: fc.constantFrom(...VALID_PROVIDERS),
  description: fc
    .array(
      fc.constantFrom(
        "Learn the basics of",
        "Deep dive into",
        "Comprehensive course on",
        "Hands-on training for",
        "Expert-level coverage of"
      ),
      { minLength: 1, maxLength: 1 }
    )
    .chain((prefix) =>
      fc.constantFrom(...SAMPLE_TOPICS).map(
        (topic) => `${prefix[0]} ${topic} with practical examples and projects.`
      )
    ),
  difficultyLevel: fc.constantFrom(...VALID_DIFFICULTY_LEVELS),
  topics: fc.array(fc.constantFrom(...SAMPLE_TOPICS), {
    minLength: 1,
    maxLength: 4,
  }),
});

const catalogArb = fc.array(courseRecordArb, { minLength: 5, maxLength: 30 });

const filterCriteriaArb: fc.Arbitrary<FilterCriteria> = fc.record(
  {
    provider: fc.constantFrom(...VALID_PROVIDERS),
    difficulty: fc.constantFrom(...VALID_DIFFICULTY_LEVELS),
    topic: fc.constantFrom(...SAMPLE_TOPICS),
    search: fc.constantFrom(
      ...SAMPLE_TOPICS,
      "Introduction",
      "Advanced",
      "Fundamentals",
      "Mastering",
      "basics",
      "Deep dive"
    ),
  },
  { requiredKeys: [] }
);

// --- Property 7: Filter Correctness ---

describe("Property 7: Filter Correctness", () => {
  /**
   * **Validates: Requirements 4.4, 4.5**
   *
   * For any combination of filter criteria (provider, difficulty, topic) and any
   * search keyword applied to the Course_Catalog, every course in the result set
   * SHALL match ALL applied filter criteria, and every course matching all criteria
   * SHALL appear in the result set.
   */

  it("every result matches ALL applied filters", () => {
    fc.assert(
      fc.property(catalogArb, filterCriteriaArb, (catalog, filters) => {
        const results = filterCourses(catalog, filters);

        for (const course of results) {
          // Provider filter: exact match
          if (filters.provider) {
            expect(course.provider).toBe(filters.provider);
          }

          // Difficulty filter: exact match
          if (filters.difficulty) {
            expect(course.difficultyLevel).toBe(filters.difficulty);
          }

          // Topic filter: case-insensitive substring match in topics array
          if (filters.topic) {
            const topicLower = filters.topic.toLowerCase();
            const hasMatch = course.topics.some((t) =>
              t.toLowerCase().includes(topicLower)
            );
            expect(hasMatch).toBe(true);
          }

          // Search filter: title OR description contains search (case-insensitive)
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const titleMatch = course.title
              .toLowerCase()
              .includes(searchLower);
            const descMatch = course.description
              .toLowerCase()
              .includes(searchLower);
            expect(titleMatch || descMatch).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("every matching course appears in results (completeness)", () => {
    fc.assert(
      fc.property(catalogArb, filterCriteriaArb, (catalog, filters) => {
        const results = filterCourses(catalog, filters);

        // For each course in the catalog, if it matches all filters, it must be in results
        for (const course of catalog) {
          const matchesProvider =
            !filters.provider || course.provider === filters.provider;
          const matchesDifficulty =
            !filters.difficulty ||
            course.difficultyLevel === filters.difficulty;
          const matchesTopic =
            !filters.topic ||
            course.topics.some((t) =>
              t.toLowerCase().includes(filters.topic!.toLowerCase())
            );
          const matchesSearch =
            !filters.search ||
            course.title
              .toLowerCase()
              .includes(filters.search.toLowerCase()) ||
            course.description
              .toLowerCase()
              .includes(filters.search.toLowerCase());

          if (
            matchesProvider &&
            matchesDifficulty &&
            matchesTopic &&
            matchesSearch
          ) {
            expect(results).toContain(course);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("no course in the result set fails any applied filter", () => {
    fc.assert(
      fc.property(catalogArb, filterCriteriaArb, (catalog, filters) => {
        const results = filterCourses(catalog, filters);

        for (const course of results) {
          // Verify no filter is violated
          if (filters.provider) {
            expect(course.provider).not.toBe(
              VALID_PROVIDERS.find(
                (p) => p !== filters.provider && p === course.provider
              )
            );
            expect(course.provider).toBe(filters.provider);
          }

          if (filters.difficulty) {
            expect(course.difficultyLevel).toBe(filters.difficulty);
          }

          if (filters.topic) {
            const topicLower = filters.topic.toLowerCase();
            const violates = !course.topics.some((t) =>
              t.toLowerCase().includes(topicLower)
            );
            expect(violates).toBe(false);
          }

          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const inTitle = course.title.toLowerCase().includes(searchLower);
            const inDesc = course.description
              .toLowerCase()
              .includes(searchLower);
            expect(inTitle || inDesc).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("with no filters applied, all courses are returned", () => {
    fc.assert(
      fc.property(catalogArb, (catalog) => {
        const results = filterCourses(catalog, {});
        expect(results.length).toBe(catalog.length);
        expect(results).toEqual(catalog);
      }),
      { numRuns: 100 }
    );
  });

  it("with all filters applied simultaneously, correctness holds", () => {
    fc.assert(
      fc.property(
        catalogArb,
        fc.record({
          provider: fc.constantFrom(...VALID_PROVIDERS),
          difficulty: fc.constantFrom(...VALID_DIFFICULTY_LEVELS),
          topic: fc.constantFrom(...SAMPLE_TOPICS),
          search: fc.constantFrom(...SAMPLE_TOPICS, "Introduction", "Advanced"),
        }),
        (catalog, filters) => {
          const results = filterCourses(catalog, filters);

          // Every result must match ALL four filters
          for (const course of results) {
            expect(course.provider).toBe(filters.provider);
            expect(course.difficultyLevel).toBe(filters.difficulty);

            const topicLower = filters.topic.toLowerCase();
            const hasTopicMatch = course.topics.some((t) =>
              t.toLowerCase().includes(topicLower)
            );
            expect(hasTopicMatch).toBe(true);

            const searchLower = filters.search.toLowerCase();
            const hasSearchMatch =
              course.title.toLowerCase().includes(searchLower) ||
              course.description.toLowerCase().includes(searchLower);
            expect(hasSearchMatch).toBe(true);
          }

          // Completeness: every course matching all filters is in results
          const expected = catalog.filter((c) => {
            return (
              c.provider === filters.provider &&
              c.difficultyLevel === filters.difficulty &&
              c.topics.some((t) =>
                t.toLowerCase().includes(filters.topic.toLowerCase())
              ) &&
              (c.title
                .toLowerCase()
                .includes(filters.search.toLowerCase()) ||
                c.description
                  .toLowerCase()
                  .includes(filters.search.toLowerCase()))
            );
          });
          expect(results.length).toBe(expected.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
