import type { NormalizedCourse } from "@/lib/types";
import type { ProviderAdapter, RawCourseData } from "./provider-adapter";

/**
 * Raw response shape from Google's AI/ML course catalog.
 * Based on Google Cloud Skills Boost / Google AI courses structure.
 */
interface GoogleRawCourse {
  id: string;
  title: string;
  summary: string;
  duration_minutes: number;
  skill_level: string;
  tags: string[];
  image_url: string;
  url: string;
}

export class GoogleAdapter implements ProviderAdapter {
  async fetch(): Promise<RawCourseData[]> {
    // TODO: Replace with real Google AI/Cloud Skills Boost API call
    // GET https://cloud.google.com/training/api/courses?category=ai-ml
    const mockCourses: GoogleRawCourse[] = [
      {
        id: "google-gen-ai-101",
        title: "Introduction to Generative AI",
        summary:
          "An introductory course explaining what generative AI is, how it is used, and how it differs from traditional machine learning methods.",
        duration_minutes: 45,
        skill_level: "introductory",
        tags: ["generative-ai", "machine-learning", "ai-fundamentals"],
        image_url: "https://cloud.google.com/images/gen-ai-intro.jpg",
        url: "https://cloud.google.com/training/courses/introduction-to-generative-ai",
      },
      {
        id: "google-llm-102",
        title: "Introduction to Large Language Models",
        summary:
          "Learn about large language models (LLMs), their use cases, and how to use prompt tuning to enhance LLM performance.",
        duration_minutes: 60,
        skill_level: "introductory",
        tags: ["large-language-models", "prompt-engineering", "generative-ai"],
        image_url: "https://cloud.google.com/images/llm-intro.jpg",
        url: "https://cloud.google.com/training/courses/introduction-to-llms",
      },
      {
        id: "google-responsible-ai-103",
        title: "Responsible AI: Applying AI Principles with Google Cloud",
        summary:
          "Learn how to operationalize responsible AI practices using Google Cloud tools and frameworks.",
        duration_minutes: 120,
        skill_level: "intermediate",
        tags: ["responsible-ai", "ai-ethics", "google-cloud"],
        image_url: "https://cloud.google.com/images/responsible-ai.jpg",
        url: "https://cloud.google.com/training/courses/responsible-ai",
      },
    ];

    return mockCourses.map((course) => ({
      provider: "google",
      rawPayload: course,
    }));
  }

  normalize(raw: RawCourseData): NormalizedCourse {
    const course = raw.rawPayload as GoogleRawCourse;

    return {
      id: `google-${course.id}`,
      externalId: course.id,
      title: course.title,
      provider: "google",
      description: course.summary,
      url: course.url,
      duration: this.formatDuration(course.duration_minutes),
      difficultyLevel: this.mapDifficulty(course.skill_level),
      topics: course.tags,
      thumbnailUrl: course.image_url,
      isFree: true,
      lastVerified: new Date(),
    };
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }

  private mapDifficulty(
    level: string
  ): "beginner" | "intermediate" | "advanced" {
    const normalized = level.toLowerCase();
    if (normalized === "intermediate") return "intermediate";
    if (normalized === "advanced") return "advanced";
    return "beginner";
  }
}
