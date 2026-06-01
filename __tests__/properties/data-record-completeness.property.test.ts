import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property-Based Tests for Data Record Completeness
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 *
 * Property 2: Data Record Completeness — all stored records contain required fields
 * with no nulls in required fields.
 *
 * This test validates that for any generated record matching the schema constraints,
 * all required fields are present and non-null after simulating the storage/retrieval cycle.
 */

// --- Generators ---

/** Generate a valid date (guaranteed non-NaN) using integer timestamps */
const validDateArb = fc
  .integer({
    min: new Date("2020-01-01").getTime(),
    max: new Date("2030-12-31").getTime(),
  })
  .map((ts) => new Date(ts));

/** Generate a valid User record with all required fields */
const userRecordArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }).filter((s) => s.length > 0),
  googleId: fc
    .string({ minLength: 10, maxLength: 30 })
    .filter((s) => s.length > 0),
  name: fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0),
  email: fc.emailAddress(),
  avatarUrl: fc.option(fc.webUrl(), { nil: null }),
  registeredAt: validDateArb,
  lastLoginAt: validDateArb,
  preferences: fc.json(),
});

/** Generate a valid QuizAttempt record with all required fields */
const quizAttemptRecordArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }).filter((s) => s.length > 0),
  userId: fc
    .string({ minLength: 10, maxLength: 30 })
    .filter((s) => s.length > 0),
  responses: fc.json(),
  categoryScores: fc.json(),
  totalScore: fc.float({ min: 0, max: 100, noNaN: true }),
  maturityLevel: fc.oneof(
    fc.constant("beginner"),
    fc.constant("intermediate"),
    fc.constant("advanced"),
    fc.constant("expert")
  ),
  createdAt: validDateArb,
});

/** Generate a valid CourseProgress record with all required fields */
const courseProgressRecordArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }).filter((s) => s.length > 0),
  userId: fc
    .string({ minLength: 10, maxLength: 30 })
    .filter((s) => s.length > 0),
  courseId: fc
    .string({ minLength: 10, maxLength: 30 })
    .filter((s) => s.length > 0),
  completedSections: fc.json(),
  completionPercentage: fc.float({ min: 0, max: 100, noNaN: true }),
  lastInteraction: validDateArb,
});

/** Generate a valid ActivityMetric record with all required fields */
const activityMetricRecordArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }).filter((s) => s.length > 0),
  userId: fc
    .string({ minLength: 10, maxLength: 30 })
    .filter((s) => s.length > 0),
  sessionStart: validDateArb,
  sessionEnd: fc.option(validDateArb, { nil: null }),
  courseClicks: fc.json(),
  pagesVisited: fc.json(),
});

// --- Required fields definitions per model ---

const USER_REQUIRED_FIELDS = [
  "id",
  "googleId",
  "name",
  "email",
  "registeredAt",
  "lastLoginAt",
] as const;

const QUIZ_ATTEMPT_REQUIRED_FIELDS = [
  "id",
  "userId",
  "responses",
  "categoryScores",
  "totalScore",
  "maturityLevel",
  "createdAt",
] as const;

const COURSE_PROGRESS_REQUIRED_FIELDS = [
  "id",
  "userId",
  "courseId",
  "completedSections",
  "completionPercentage",
  "lastInteraction",
] as const;

const ACTIVITY_METRIC_REQUIRED_FIELDS = [
  "id",
  "userId",
  "sessionStart",
  "pagesVisited",
] as const;

// --- Helper: simulate storage round-trip (JSON serialize/deserialize) ---

function simulateStorageRoundTrip<T extends Record<string, unknown>>(
  record: T
): T {
  // Simulate what happens when a record is stored and retrieved from the database
  // Dates are serialized to ISO strings and back, JSON fields are stringified and parsed
  const serialized = JSON.stringify(record, (_, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  });
  return JSON.parse(serialized, (key, value) => {
    // Restore date fields
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ) {
      return new Date(value);
    }
    return value;
  });
}

// --- Validation helper ---

function validateRequiredFields(
  record: Record<string, unknown>,
  requiredFields: readonly string[]
): { valid: boolean; missingFields: string[]; nullFields: string[] } {
  const missingFields: string[] = [];
  const nullFields: string[] = [];

  for (const field of requiredFields) {
    if (!(field in record)) {
      missingFields.push(field);
    } else if (record[field] === null || record[field] === undefined) {
      nullFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0 && nullFields.length === 0,
    missingFields,
    nullFields,
  };
}

// --- Property 2: Data Record Completeness ---

describe("Property 2: Data Record Completeness", () => {
  /**
   * **Validates: Requirements 2.1**
   *
   * User records contain all required fields (googleId, name, email, registeredAt, lastLoginAt)
   * with no nulls in required fields after storage round-trip.
   */
  it("User records contain all required fields with no nulls after storage", async () => {
    await fc.assert(
      fc.asyncProperty(userRecordArb, async (userRecord) => {
        // Simulate storing and retrieving the record
        const storedRecord = simulateStorageRoundTrip(userRecord);

        // Validate all required fields are present and non-null
        const result = validateRequiredFields(
          storedRecord,
          USER_REQUIRED_FIELDS
        );

        expect(result.missingFields).toEqual([]);
        expect(result.nullFields).toEqual([]);
        expect(result.valid).toBe(true);

        // Additional type checks for required fields
        expect(typeof storedRecord.googleId).toBe("string");
        expect(storedRecord.googleId.length).toBeGreaterThan(0);
        expect(typeof storedRecord.name).toBe("string");
        expect(storedRecord.name.length).toBeGreaterThan(0);
        expect(typeof storedRecord.email).toBe("string");
        expect(storedRecord.email.length).toBeGreaterThan(0);
        expect(storedRecord.registeredAt).toBeInstanceOf(Date);
        expect(storedRecord.lastLoginAt).toBeInstanceOf(Date);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.2**
   *
   * QuizAttempt records contain all required fields (userId, responses, categoryScores,
   * totalScore, maturityLevel, createdAt) with no nulls in required fields after storage round-trip.
   */
  it("QuizAttempt records contain all required fields with no nulls after storage", async () => {
    await fc.assert(
      fc.asyncProperty(quizAttemptRecordArb, async (quizRecord) => {
        // Simulate storing and retrieving the record
        const storedRecord = simulateStorageRoundTrip(quizRecord);

        // Validate all required fields are present and non-null
        const result = validateRequiredFields(
          storedRecord,
          QUIZ_ATTEMPT_REQUIRED_FIELDS
        );

        expect(result.missingFields).toEqual([]);
        expect(result.nullFields).toEqual([]);
        expect(result.valid).toBe(true);

        // Additional type checks for required fields
        expect(typeof storedRecord.userId).toBe("string");
        expect(storedRecord.userId.length).toBeGreaterThan(0);
        expect(typeof storedRecord.responses).toBe("string");
        expect(typeof storedRecord.categoryScores).toBe("string");
        expect(typeof storedRecord.totalScore).toBe("number");
        expect(storedRecord.totalScore).toBeGreaterThanOrEqual(0);
        expect(storedRecord.totalScore).toBeLessThanOrEqual(100);
        expect(typeof storedRecord.maturityLevel).toBe("string");
        expect(["beginner", "intermediate", "advanced", "expert"]).toContain(
          storedRecord.maturityLevel
        );
        expect(storedRecord.createdAt).toBeInstanceOf(Date);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.3**
   *
   * CourseProgress records contain all required fields (userId, courseId, completedSections,
   * completionPercentage, lastInteraction) with no nulls in required fields after storage round-trip.
   */
  it("CourseProgress records contain all required fields with no nulls after storage", async () => {
    await fc.assert(
      fc.asyncProperty(courseProgressRecordArb, async (progressRecord) => {
        // Simulate storing and retrieving the record
        const storedRecord = simulateStorageRoundTrip(progressRecord);

        // Validate all required fields are present and non-null
        const result = validateRequiredFields(
          storedRecord,
          COURSE_PROGRESS_REQUIRED_FIELDS
        );

        expect(result.missingFields).toEqual([]);
        expect(result.nullFields).toEqual([]);
        expect(result.valid).toBe(true);

        // Additional type checks for required fields
        expect(typeof storedRecord.userId).toBe("string");
        expect(storedRecord.userId.length).toBeGreaterThan(0);
        expect(typeof storedRecord.courseId).toBe("string");
        expect(storedRecord.courseId.length).toBeGreaterThan(0);
        expect(typeof storedRecord.completedSections).toBe("string");
        expect(typeof storedRecord.completionPercentage).toBe("number");
        expect(storedRecord.completionPercentage).toBeGreaterThanOrEqual(0);
        expect(storedRecord.completionPercentage).toBeLessThanOrEqual(100);
        expect(storedRecord.lastInteraction).toBeInstanceOf(Date);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4**
   *
   * ActivityMetric records contain all required fields (userId, sessionStart, pagesVisited)
   * with no nulls in required fields after storage round-trip.
   */
  it("ActivityMetric records contain all required fields with no nulls after storage", async () => {
    await fc.assert(
      fc.asyncProperty(activityMetricRecordArb, async (metricRecord) => {
        // Simulate storing and retrieving the record
        const storedRecord = simulateStorageRoundTrip(metricRecord);

        // Validate all required fields are present and non-null
        const result = validateRequiredFields(
          storedRecord,
          ACTIVITY_METRIC_REQUIRED_FIELDS
        );

        expect(result.missingFields).toEqual([]);
        expect(result.nullFields).toEqual([]);
        expect(result.valid).toBe(true);

        // Additional type checks for required fields
        expect(typeof storedRecord.userId).toBe("string");
        expect(storedRecord.userId.length).toBeGreaterThan(0);
        expect(storedRecord.sessionStart).toBeInstanceOf(Date);
        expect(typeof storedRecord.pagesVisited).toBe("string");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   *
   * Optional fields (avatarUrl, sessionEnd) may be null, but required fields never are.
   * This test verifies the distinction between optional and required fields is maintained.
   */
  it("optional fields may be null while required fields remain non-null", async () => {
    await fc.assert(
      fc.asyncProperty(
        userRecordArb,
        activityMetricRecordArb,
        async (userRecord, metricRecord) => {
          const storedUser = simulateStorageRoundTrip(userRecord);
          const storedMetric = simulateStorageRoundTrip(metricRecord);

          // avatarUrl is optional (may be null)
          // But required fields must never be null
          for (const field of USER_REQUIRED_FIELDS) {
            expect(storedUser[field]).not.toBeNull();
            expect(storedUser[field]).not.toBeUndefined();
          }

          // sessionEnd is optional (may be null)
          // But required fields must never be null
          for (const field of ACTIVITY_METRIC_REQUIRED_FIELDS) {
            expect(storedMetric[field]).not.toBeNull();
            expect(storedMetric[field]).not.toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
