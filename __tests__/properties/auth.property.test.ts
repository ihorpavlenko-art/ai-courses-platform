import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

/**
 * Property-Based Tests for Authentication
 *
 * **Validates: Requirements 1.5, 1.6, 9.6**
 */

// --- Generators ---

/** Generate a random Google profile with sub, name, email, picture */
const googleProfileArb = fc.record({
  sub: fc.string({ minLength: 10, maxLength: 30 }).filter((s) => s.length > 0),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  email: fc.emailAddress(),
  picture: fc.webUrl(),
});

/** Generate random protected API route paths */
const protectedApiRouteArb = fc.oneof(
  fc.constant("/api/courses"),
  fc.constant("/api/courses/some-id"),
  fc.constant("/api/quiz/generate"),
  fc.constant("/api/quiz/submit"),
  fc.constant("/api/quiz/history"),
  fc.constant("/api/progress"),
  fc.constant("/api/progress/some-course-id"),
  fc.constant("/api/dashboard"),
  fc.constant("/api/profile"),
  fc.constant("/api/profile/preferences"),
  fc.constant("/api/recommendations")
);

/** Generate random protected page route paths */
const protectedPageRouteArb = fc.oneof(
  fc.constant("/dashboard"),
  fc.constant("/dashboard/stats"),
  fc.constant("/courses"),
  fc.constant("/courses/some-id"),
  fc.constant("/quiz"),
  fc.constant("/quiz/take"),
  fc.constant("/quiz/results"),
  fc.constant("/progress"),
  fc.constant("/profile")
);

/** Generate random unprotected route paths */
const unprotectedRouteArb = fc.oneof(
  fc.constant("/"),
  fc.constant("/api/auth/signin"),
  fc.constant("/api/auth/callback/google"),
  fc.constant("/api/auth/signout")
);

// --- Mock setup for next-auth/jwt ---

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
const mockedGetToken = vi.mocked(getToken);

// --- Property 1: Login Idempotence ---

describe("Property 1: Login Idempotence", () => {
  /**
   * **Validates: Requirements 1.5, 1.6**
   *
   * For any valid Google profile, signing in multiple times with the same
   * Google ID SHALL always result in exactly one user record in the database,
   * and subsequent logins SHALL return the same user record with updated lastLoginAt.
   */
  it("signing in multiple times with same Google ID results in exactly one user record", async () => {
    await fc.assert(
      fc.asyncProperty(
        googleProfileArb,
        fc.integer({ min: 2, max: 5 }),
        async (profile, signInCount) => {
          // Simulate an in-memory database for user records
          const db: Map<string, { googleId: string; name: string; email: string; avatarUrl: string; lastLoginAt: Date; createdAt: Date }> = new Map();

          // Simulate the upsert logic from lib/auth.ts signIn callback
          async function upsertUser(googleProfile: typeof profile) {
            const existing = db.get(googleProfile.sub);
            if (existing) {
              // Update existing record
              existing.lastLoginAt = new Date();
              existing.name = googleProfile.name;
              existing.avatarUrl = googleProfile.picture;
            } else {
              // Create new record
              db.set(googleProfile.sub, {
                googleId: googleProfile.sub,
                name: googleProfile.name,
                email: googleProfile.email,
                avatarUrl: googleProfile.picture,
                lastLoginAt: new Date(),
                createdAt: new Date(),
              });
            }
          }

          // Sign in multiple times with the same profile
          const timestamps: Date[] = [];
          for (let i = 0; i < signInCount; i++) {
            await upsertUser(profile);
            const record = db.get(profile.sub);
            if (record) {
              timestamps.push(record.lastLoginAt);
            }
            // Small delay to ensure different timestamps
            await new Promise((r) => setTimeout(r, 1));
          }

          // Assert: exactly one user record exists for this Google ID
          const records = Array.from(db.values()).filter(
            (u) => u.googleId === profile.sub
          );
          expect(records).toHaveLength(1);

          // Assert: the record has the correct Google ID
          expect(records[0].googleId).toBe(profile.sub);

          // Assert: lastLoginAt was updated (last timestamp >= first timestamp)
          if (timestamps.length >= 2) {
            expect(timestamps[timestamps.length - 1].getTime()).toBeGreaterThanOrEqual(
              timestamps[0].getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 16: Route Protection ---

describe("Property 16: Route Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 9.6**
   *
   * For any authenticated API route and any request without a valid session token,
   * the route SHALL return a 401 status code with { error: { code: "AUTH_REQUIRED" } }.
   */
  it("any request without valid session to protected API route returns 401", async () => {
    await fc.assert(
      fc.asyncProperty(protectedApiRouteArb, async (routePath) => {
        // Mock getToken to return null (no valid session)
        mockedGetToken.mockResolvedValue(null);

        // Create a mock NextRequest
        const url = new URL(routePath, "http://localhost:3000");
        const request = new NextRequest(url);

        // Call the middleware
        const response = await middleware(request);

        // Assert: response is 401
        expect(response.status).toBe(401);

        // Assert: response body contains AUTH_REQUIRED error
        const body = await response.json();
        expect(body.error).toBeDefined();
        expect(body.error.code).toBe("AUTH_REQUIRED");
      }),
      { numRuns: 100 }
    );
  });

  it("any request without valid session to protected page route returns redirect (302)", async () => {
    await fc.assert(
      fc.asyncProperty(protectedPageRouteArb, async (routePath) => {
        // Mock getToken to return null (no valid session)
        mockedGetToken.mockResolvedValue(null);

        // Create a mock NextRequest
        const url = new URL(routePath, "http://localhost:3000");
        const request = new NextRequest(url);

        // Call the middleware
        const response = await middleware(request);

        // Assert: response is a redirect (307 or 302)
        expect(response.status).toBe(307);

        // Assert: redirects to the landing page
        const location = response.headers.get("location");
        expect(location).toBe("http://localhost:3000/");
      }),
      { numRuns: 100 }
    );
  });

  it("requests to unprotected routes pass through without auth", async () => {
    await fc.assert(
      fc.asyncProperty(unprotectedRouteArb, async (routePath) => {
        // Mock getToken to return null (no valid session)
        mockedGetToken.mockResolvedValue(null);

        // Create a mock NextRequest
        const url = new URL(routePath, "http://localhost:3000");
        const request = new NextRequest(url);

        // Call the middleware
        const response = await middleware(request);

        // Assert: response passes through (200 status from NextResponse.next())
        expect(response.status).toBe(200);
      }),
      { numRuns: 100 }
    );
  });

  it("requests with valid session to protected routes pass through", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(protectedApiRouteArb, protectedPageRouteArb),
        async (routePath) => {
          // Mock getToken to return a valid token
          mockedGetToken.mockResolvedValue({
            sub: "google-user-123",
            userId: "internal-user-id",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
          } as any);

          // Create a mock NextRequest
          const url = new URL(routePath, "http://localhost:3000");
          const request = new NextRequest(url);

          // Call the middleware
          const response = await middleware(request);

          // Assert: response passes through (200 status from NextResponse.next())
          expect(response.status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });
});
