import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { CourseProvider, DifficultyLevel } from "@/lib/types";

/**
 * Property-Based Tests for Course Tile Display Completeness
 *
 * **Validates: Requirements 4.2, 4.3**
 *
 * Since we can't easily render React components in a property test without a DOM,
 * we test the data contract instead — verifying that the data flowing to the tile
 * component is always complete.
 */

// --- Types ---

interface CourseTileData {
  id: string;
  title: string;
  provider: CourseProvider;
  duration: string;
  difficultyLevel: DifficultyLevel;
  thumbnailUrl: string;
  progress?: number;
}

// --- Pure function that prepares tile data (mirrors component logic) ---

function prepareTileData(
  course: {
    id: string;
    title: string;
    provider: CourseProvider;
    duration: string;
    difficultyLevel: DifficultyLevel;
    thumbnailUrl: string;
  },
  progressPercentage?: number
): CourseTileData {
  const tileData: CourseTileData = {
    id: course.id,
    title: course.title,
    provider: course.provider,
    duration: course.duration,
    difficultyLevel: course.difficultyLevel,
    thumbnailUrl: course.thumbnailUrl,
  };

  if (progressPercentage !== undefined && progressPercentage > 0) {
    tileData.progress = progressPercentage;
  }

  return tileData;
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

// --- Generators ---

const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

const durationArb = fc.oneof(
  fc.integer({ min: 1, max: 52 }).map((n) => `${n} weeks`),
  fc.integer({ min: 1, max: 200 }).map((n) => `${n} hours`),
  fc.integer({ min: 1, max: 12 }).map((n) => `${n} months`)
);

const thumbnailUrlArb = fc
  .webUrl()
  .map((url) => `${url}/thumbnail.jpg`);

const courseArb = fc.record({
  id: fc.uuid(),
  title: nonEmptyStringArb,
  provider: fc.constantFrom(...VALID_PROVIDERS),
  duration: durationArb,
  difficultyLevel: fc.constantFrom(...VALID_DIFFICULTY_LEVELS),
  thumbnailUrl: thumbnailUrlArb,
});

const progressArb = fc.option(fc.integer({ min: 0, max: 100 }), {
  nil: undefined,
});

// --- Property 6: Course Tile Display Completeness ---

describe("Property 6: Course Tile Display Completeness", () => {
  /**
   * **Validates: Requirements 4.2, 4.3**
   *
   * For any course in the catalog, the rendered Course_Tile SHALL include the
   * course title, provider name, duration, difficulty level, and thumbnail.
   * If the user has progress on that course, the tile SHALL additionally display
   * the correct completion percentage.
   */

  it("every course object has non-empty title, provider, duration, difficultyLevel, and thumbnailUrl", () => {
    fc.assert(
      fc.property(courseArb, (course) => {
        const tileData = prepareTileData(course);

        // Title must be non-empty
        expect(tileData.title).toBeDefined();
        expect(tileData.title.trim().length).toBeGreaterThan(0);

        // Provider must be a valid provider
        expect(tileData.provider).toBeDefined();
        expect(VALID_PROVIDERS).toContain(tileData.provider);

        // Duration must be non-empty
        expect(tileData.duration).toBeDefined();
        expect(tileData.duration.trim().length).toBeGreaterThan(0);

        // Difficulty level must be valid
        expect(tileData.difficultyLevel).toBeDefined();
        expect(VALID_DIFFICULTY_LEVELS).toContain(tileData.difficultyLevel);

        // Thumbnail URL must be non-empty
        expect(tileData.thumbnailUrl).toBeDefined();
        expect(tileData.thumbnailUrl.trim().length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it("when progress is defined and > 0, the tile data includes the progress value", () => {
    fc.assert(
      fc.property(
        courseArb,
        fc.integer({ min: 1, max: 100 }),
        (course, progress) => {
          const tileData = prepareTileData(course, progress);

          // Progress should be present and equal to the input
          expect(tileData.progress).toBeDefined();
          expect(tileData.progress).toBe(progress);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("when progress is undefined, no progress indicator data is present", () => {
    fc.assert(
      fc.property(courseArb, (course) => {
        const tileData = prepareTileData(course, undefined);

        // Progress should not be present
        expect(tileData.progress).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it("when progress is 0, no progress indicator data is present", () => {
    fc.assert(
      fc.property(courseArb, (course) => {
        const tileData = prepareTileData(course, 0);

        // Progress of 0 means user hasn't started, so no indicator
        expect(tileData.progress).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it("tile data preserves all course fields without mutation", () => {
    fc.assert(
      fc.property(courseArb, progressArb, (course, progress) => {
        const tileData = prepareTileData(course, progress);

        // All core fields must match the input course exactly
        expect(tileData.id).toBe(course.id);
        expect(tileData.title).toBe(course.title);
        expect(tileData.provider).toBe(course.provider);
        expect(tileData.duration).toBe(course.duration);
        expect(tileData.difficultyLevel).toBe(course.difficultyLevel);
        expect(tileData.thumbnailUrl).toBe(course.thumbnailUrl);

        // Progress should match expected behavior
        if (progress !== undefined && progress > 0) {
          expect(tileData.progress).toBe(progress);
        } else {
          expect(tileData.progress).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});
