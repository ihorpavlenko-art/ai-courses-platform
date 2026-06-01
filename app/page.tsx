"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function LandingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted text-lg">Loading...</div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case "OAuthSignin":
        return "Could not start the sign-in process. Please try again.";
      case "OAuthCallback":
        return "There was a problem during the sign-in callback. Please try again.";
      case "OAuthAccountNotLinked":
        return "This email is already associated with another account.";
      case "Callback":
        return "An error occurred during authentication. Please try again.";
      case "AccessDenied":
        return "Access was denied. You may not have permission to sign in.";
      default:
        return "An unexpected authentication error occurred. Please try again.";
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Hero Section */}
      <main id="main-content" className="flex flex-col items-center justify-center flex-1 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Title */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            AI Courses Platform
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-lg text-muted sm:text-xl">
            Discover and learn from the best free AI courses aggregated from top
            providers like Coursera, edX, Google, Microsoft, and DeepLearning.AI
            — all in one place.
          </p>

          {/* Features List */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto pt-4">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground text-sm">
                AI Maturity Quiz
              </h3>
              <p className="text-xs text-muted text-center">
                Assess your AI knowledge level and get a personalized learning
                path
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground text-sm">
                Smart Recommendations
              </h3>
              <p className="text-xs text-muted text-center">
                Get course suggestions tailored to your skill gaps and goals
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground text-sm">
                Progress Tracking
              </h3>
              <p className="text-xs text-muted text-center">
                Track your learning journey with detailed progress metrics
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="max-w-md mx-auto p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm"
              role="alert"
            >
              {getErrorMessage(error)}
            </div>
          )}

          {/* Email Sign-In Form */}
          <div className="pt-4 max-w-sm mx-auto w-full">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsLoading(true);
                const result = await signIn("credentials", {
                  email,
                  name,
                  callbackUrl: "/dashboard",
                });
                if (result?.error) {
                  setIsLoading(false);
                }
              }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-white font-medium hover:bg-primary-hover transition-colors shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Sign in with Email"}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted border-t border-border">
        <p>
          Free AI courses from Coursera, edX, Google, Microsoft, and
          DeepLearning.AI
        </p>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted text-lg">Loading...</div>
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
