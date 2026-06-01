import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { withErrorHandling } from "@/lib/api-handler";
import {
  AppError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  AggregationError,
} from "@/lib/errors";
import { NextResponse } from "next/server";

/**
 * Property-Based Tests for API Error Structure
 *
 * **Validates: Requirements 9.5**
 *
 * Property 15: API Error Structure — all error responses contain
 * `error.code`, `error.message`, and `statusCode`
 */

// --- Generators ---

/** Generate a random AppError with arbitrary code, message, statusCode */
const appErrorArb = fc
  .record({
    code: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    message: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    statusCode: fc.oneof(
      fc.constant(400),
      fc.constant(401),
      fc.constant(403),
      fc.constant(404),
      fc.constant(409),
      fc.constant(422),
      fc.constant(500),
      fc.constant(502),
      fc.constant(503)
    ),
    details: fc.oneof(
      fc.constant(undefined),
      fc.string(),
      fc.dictionary(fc.string({ minLength: 1 }), fc.string())
    ),
  })
  .map(({ code, message, statusCode, details }) => new AppError(code, message, statusCode, details));

/** Generate a random AuthenticationError */
const authErrorArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0)
  .map((msg) => new AuthenticationError(msg));

/** Generate a random NotFoundError */
const notFoundErrorArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0)
  .map((resource) => new NotFoundError(resource));

/** Generate a random ValidationError */
const validationErrorArb = fc
  .dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    { minKeys: 1, maxKeys: 5 }
  )
  .map((details) => new ValidationError(details));

/** Generate a random AggregationError */
const aggregationErrorArb = fc
  .record({
    provider: fc.oneof(
      fc.constant("coursera"),
      fc.constant("edx"),
      fc.constant("google"),
      fc.constant("microsoft"),
      fc.constant("deeplearning_ai")
    ),
    causeMessage: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  })
  .map(({ provider, causeMessage }) => new AggregationError(provider, new Error(causeMessage)));

/** Generate any known error type */
const anyAppErrorArb = fc.oneof(
  appErrorArb,
  authErrorArb,
  notFoundErrorArb,
  validationErrorArb,
  aggregationErrorArb
);

/** Generate a generic (non-AppError) error to test unhandled error path */
const genericErrorArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
  .map((msg) => new Error(msg));

// --- Helper ---

function createMockRequest(path: string = "/api/test"): Request {
  return new Request(`http://localhost:3000${path}`, { method: "GET" });
}

// --- Property 15: API Error Structure ---

describe("Property 15: API Error Structure", () => {
  /**
   * **Validates: Requirements 9.5**
   *
   * For any API route and any AppError thrown, the response SHALL contain
   * a JSON body with `error.code` (string), `error.message` (string),
   * and `statusCode` (integer matching the HTTP status code).
   */
  it("all AppError responses contain error.code, error.message, and statusCode", async () => {
    await fc.assert(
      fc.asyncProperty(anyAppErrorArb, async (error) => {
        // Create a handler that throws the given error
        const handler = withErrorHandling(async () => {
          throw error;
        });

        const request = createMockRequest();
        const response = await handler(request);
        const body = await response.json();

        // Assert: response has correct HTTP status
        expect(response.status).toBe(error.statusCode);

        // Assert: body has error.code as a non-empty string
        expect(body.error).toBeDefined();
        expect(typeof body.error.code).toBe("string");
        expect(body.error.code.length).toBeGreaterThan(0);

        // Assert: body has error.message as a non-empty string
        expect(typeof body.error.message).toBe("string");
        expect(body.error.message.length).toBeGreaterThan(0);

        // Assert: body has statusCode as a number matching HTTP status
        expect(typeof body.statusCode).toBe("number");
        expect(body.statusCode).toBe(error.statusCode);
        expect(body.statusCode).toBe(response.status);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 9.5**
   *
   * For any unhandled (non-AppError) error, the response SHALL still contain
   * the structured error format with error.code, error.message, and statusCode 500.
   */
  it("unhandled errors produce structured 500 responses with error.code, error.message, and statusCode", async () => {
    await fc.assert(
      fc.asyncProperty(genericErrorArb, async (error) => {
        // Create a handler that throws a generic error
        const handler = withErrorHandling(async () => {
          throw error;
        });

        const request = createMockRequest();
        const response = await handler(request);
        const body = await response.json();

        // Assert: response has 500 HTTP status
        expect(response.status).toBe(500);

        // Assert: body has error.code as a non-empty string
        expect(body.error).toBeDefined();
        expect(typeof body.error.code).toBe("string");
        expect(body.error.code.length).toBeGreaterThan(0);
        expect(body.error.code).toBe("INTERNAL_ERROR");

        // Assert: body has error.message as a non-empty string
        expect(typeof body.error.message).toBe("string");
        expect(body.error.message.length).toBeGreaterThan(0);

        // Assert: body has statusCode as 500
        expect(typeof body.statusCode).toBe("number");
        expect(body.statusCode).toBe(500);
        expect(body.statusCode).toBe(response.status);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 9.5**
   *
   * For specific known error types (AuthenticationError, NotFoundError,
   * ValidationError, AggregationError), the response preserves the
   * correct error code and status code mapping.
   */
  it("specific error types preserve their code and statusCode in the response", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(authErrorArb, notFoundErrorArb, validationErrorArb, aggregationErrorArb),
        async (error) => {
          const handler = withErrorHandling(async () => {
            throw error;
          });

          const request = createMockRequest();
          const response = await handler(request);
          const body = await response.json();

          // Assert: structured error fields present
          expect(body.error).toBeDefined();
          expect(typeof body.error.code).toBe("string");
          expect(typeof body.error.message).toBe("string");
          expect(typeof body.statusCode).toBe("number");

          // Assert: error code matches the thrown error's code
          expect(body.error.code).toBe(error.code);

          // Assert: statusCode matches the thrown error's statusCode
          expect(body.statusCode).toBe(error.statusCode);
          expect(response.status).toBe(error.statusCode);
        }
      ),
      { numRuns: 100 }
    );
  });
});
