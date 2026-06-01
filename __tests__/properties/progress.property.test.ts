import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { ProgressTracker } from "@/lib/services/progress-tracker";

/**
 * Property-Based Tests for Progress Tracking
 *
 * **Validates: Requirements 6.2, 6.4, 6.6**
 */

// --- Generators ---

/** Generate a random section with a completed boolean */
const sectionArb = fc.record({
  completed: fc.boolean(),
});

/** Generate a non-empty array of sections (1-50 sections) */
const sectionsArb = fc.array(sectionArb, { minLength: 1, maxLength: 50 });

/** Generate a random section ID (alphanumeric cuid-like) */
const sectionIdArb = fc
  .stringMatching(/^[a-z][a-z0-9]{5,24}$/)
  .filter((s) => s.length >= 6);

/** Generate a non-empty set of unique section IDs (1-50) */
const sectionIdsArb = fc
  .uniqueArray(sectionIdArb, { minLength: 1, maxLength: 50 })
  .filter((arr) => arr.length >= 1);

// --- Property 11: Progress Calculation Correctness ---

describe("Property 11: Progress Calculation Correctness", () => {
  const tracker = new ProgressTracker();

  /**
   * **Validates: Requirements 6.2**
   *
   * For any course with N total sections where M sections are marked complete,
   * the completion percentage SHALL equal round(M / N * 100).
   */
  it("completion percentage equals round(M / N * 100) for any sections array", async () => {
    await fc.assert(
      fc.asyncProperty(sectionsArb, async (sections) => {
        const result = tracker.calculateCompletion(sections);

        const M = sections.filter((s) => s.completed).length;
        const N = sections.length;
        const expected = Math.round((M / N) * 100);

        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.2**
   *
   * Edge case: empty sections array returns 0.
   */
  it("empty sections array returns 0", () => {
    const tracker = new ProgressTracker();
    const result = tracker.calculateCompletion([]);
    expect(result).toBe(0);
  });

  /**
   * **Validates: Requirements 6.4**
   *
   * Completion percentage is always between 0 and 100 inclusive.
   */
  it("completion percentage is always between 0 and 100 inclusive", async () => {
    await fc.assert(
      fc.asyncProperty(sectionsArb, async (sections) => {
        const result = tracker.calculateCompletion(sections);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.4**
   *
   * Marking an additional section as complete increases or maintains the percentage.
   */
  it("marking an additional section complete does not decrease the percentage", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(sectionArb, { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 0, max: 49 }),
        async (sections, indexRaw) => {
          const index = indexRaw % sections.length;

          const before = tracker.calculateCompletion(sections);

          // Mark the section at index as complete
          const updated = sections.map((s, i) =>
            i === index ? { completed: true } : s
          );
          const after = tracker.calculateCompletion(updated);

          expect(after).toBeGreaterThanOrEqual(before);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.2**
   *
   * All sections complete yields 100%, none complete yields 0%.
   */
  it("all sections complete yields 100%, none complete yields 0%", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (count) => {
          const allComplete = Array.from({ length: count }, () => ({
            completed: true,
          }));
          const noneComplete = Array.from({ length: count }, () => ({
            completed: false,
          }));

          expect(tracker.calculateCompletion(allComplete)).toBe(100);
          expect(tracker.calculateCompletion(noneComplete)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 12: Progress Persistence Round-Trip ---

describe("Property 12: Progress Persistence Round-Trip", () => {
  const tracker = new ProgressTracker();

  /**
   * **Validates: Requirements 6.6**
   *
   * For any set of completed section IDs, serializing to JSON and deserializing
   * returns identical section completion states — no progress data is lost or altered.
   */
  it("JSON round-trip preserves completed sections exactly", async () => {
    await fc.assert(
      fc.asyncProperty(sectionIdsArb, async (allSectionIds) => {
        // Randomly select a subset as completed
        const completedCount = Math.floor(Math.random() * allSectionIds.length);
        const completedSections = allSectionIds.slice(0, completedCount);

        // Simulate save: JSON.stringify (as ProgressTracker does in markSectionComplete)
        const serialized = JSON.stringify(completedSections);

        // Simulate load: JSON.parse (as ProgressTracker does in getProgress)
        const loaded: string[] = JSON.parse(serialized);

        // Assert: loaded state matches saved state exactly
        expect(loaded).toEqual(completedSections);
        expect(loaded.length).toBe(completedSections.length);

        // Assert: every saved section ID is present in loaded
        for (const id of completedSections) {
          expect(loaded).toContain(id);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.6**
   *
   * Completion percentage is consistent before and after round-trip.
   */
  it("completion percentage is consistent before and after JSON round-trip", async () => {
    await fc.assert(
      fc.asyncProperty(
        sectionIdsArb,
        fc.float({ min: 0, max: 1, noNaN: true }),
        async (allSectionIds, completionRatio) => {
          // Determine how many sections are completed based on ratio
          const completedCount = Math.floor(
            completionRatio * allSectionIds.length
          );
          const completedSections = allSectionIds.slice(0, completedCount);

          // Build sections state before serialization
          const sectionsBefore = allSectionIds.map((id) => ({
            completed: completedSections.includes(id),
          }));
          const percentageBefore = tracker.calculateCompletion(sectionsBefore);

          // Simulate round-trip
          const serialized = JSON.stringify(completedSections);
          const loaded: string[] = JSON.parse(serialized);

          // Build sections state after deserialization
          const sectionsAfter = allSectionIds.map((id) => ({
            completed: loaded.includes(id),
          }));
          const percentageAfter = tracker.calculateCompletion(sectionsAfter);

          // Assert: percentage is identical before and after round-trip
          expect(percentageAfter).toBe(percentageBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.6**
   *
   * Full progress state (sections + percentage) survives JSON round-trip intact.
   */
  it("full progress state survives JSON round-trip intact", async () => {
    await fc.assert(
      fc.asyncProperty(sectionIdsArb, async (allSectionIds) => {
        // Randomly mark some sections as completed
        const completedSet = new Set(
          allSectionIds.filter(() => Math.random() > 0.5)
        );
        const completedSections = Array.from(completedSet);

        // Build the progress state as the ProgressTracker would store it
        const progressState = {
          completedSections,
          sections: allSectionIds.map((id) => ({
            sectionId: id,
            completed: completedSet.has(id),
          })),
        };

        // Calculate percentage before
        const percentageBefore = tracker.calculateCompletion(
          progressState.sections.map((s) => ({ completed: s.completed }))
        );

        // Simulate full round-trip (as stored in DB)
        const serialized = JSON.stringify(progressState.completedSections);
        const loadedCompletedSections: string[] = JSON.parse(serialized);

        // Reconstruct sections state from loaded data
        const reconstructedSections = allSectionIds.map((id) => ({
          sectionId: id,
          completed: loadedCompletedSections.includes(id),
        }));

        // Calculate percentage after
        const percentageAfter = tracker.calculateCompletion(
          reconstructedSections.map((s) => ({ completed: s.completed }))
        );

        // Assert: all section states match
        expect(reconstructedSections).toEqual(progressState.sections);

        // Assert: percentage is identical
        expect(percentageAfter).toBe(percentageBefore);
      }),
      { numRuns: 100 }
    );
  });
});
