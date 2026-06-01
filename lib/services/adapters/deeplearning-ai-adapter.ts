import type { NormalizedCourse } from "@/lib/types";
import type { ProviderAdapter, RawCourseData } from "./provider-adapter";

/**
 * Raw response shape from DeepLearning.AI course catalog.
 * Based on the structure at https://www.deeplearning.ai/courses/
 */
interface DeepLearningAiRawCourse {
  slug: string;
  title: string;
  description: string;
  estimated_hours: number;
  difficulty: string;
  skills: string[];
  thumbnail: string;
  instructors: string[];
}

export class DeepLearningAiAdapter implements ProviderAdapter {
  async fetch(): Promise<RawCourseData[]> {
    // TODO: Replace with real DeepLearning.AI API/scraping
    // Currently no public API — would use web scraping or partnership API
    const mockCourses: DeepLearningAiRawCourse[] = [
      {
        slug: "generative-ai-for-everyone",
        title: "Generative AI for Everyone",
        description:
          "Learn how generative AI works and how to use it in your daily life and at work. Understand what AI can and cannot do.",
        estimated_hours: 5,
        difficulty: "Beginner",
        skills: ["generative-ai", "ai-fundamentals", "prompt-engineering"],
        thumbnail: "https://deeplearning.ai/images/gen-ai-everyone.jpg",
        instructors: ["Andrew Ng"],
      },
      {
        slug: "chatgpt-prompt-engineering-for-developers",
        title: "ChatGPT Prompt Engineering for Developers",
        description:
          "Learn prompt engineering best practices for application development using the OpenAI API.",
        estimated_hours: 3,
        difficulty: "Intermediate",
        skills: ["prompt-engineering", "openai-api", "llm-applications"],
        thumbnail: "https://deeplearning.ai/images/chatgpt-prompt-eng.jpg",
        instructors: ["Isa Fulford", "Andrew Ng"],
      },
      {
        slug: "langchain-for-llm-application-development",
        title: "LangChain for LLM Application Development",
        description:
          "Learn to build LLM-powered applications using LangChain framework. Cover chains, agents, memory, and evaluation.",
        estimated_hours: 4,
        difficulty: "Intermediate",
        skills: ["langchain", "llm-applications", "ai-agents"],
        thumbnail: "https://deeplearning.ai/images/langchain-llm.jpg",
        instructors: ["Harrison Chase", "Andrew Ng"],
      },
      {
        slug: "ai-agentic-design-patterns",
        title: "AI Agentic Design Patterns with AutoGen",
        description:
          "Learn to build multi-agent AI systems using agentic design patterns. Implement reflection, tool use, planning, and multi-agent collaboration.",
        estimated_hours: 3,
        difficulty: "Advanced",
        skills: ["ai-agents", "multi-agent-systems", "autogen"],
        thumbnail: "https://deeplearning.ai/images/agentic-patterns.jpg",
        instructors: ["Chi Wang", "Andrew Ng"],
      },
    ];

    return mockCourses.map((course) => ({
      provider: "deeplearning_ai",
      rawPayload: course,
    }));
  }

  normalize(raw: RawCourseData): NormalizedCourse {
    const course = raw.rawPayload as DeepLearningAiRawCourse;

    return {
      id: `deeplearning_ai-${course.slug}`,
      externalId: course.slug,
      title: course.title,
      provider: "deeplearning_ai",
      description: course.description,
      url: `https://www.deeplearning.ai/short-courses/${course.slug}`,
      duration: `${course.estimated_hours} hours`,
      difficultyLevel: this.mapDifficulty(course.difficulty),
      topics: course.skills,
      thumbnailUrl: course.thumbnail,
      isFree: true,
      lastVerified: new Date(),
    };
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
