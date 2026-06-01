import type { NormalizedCourse } from "@/lib/types";
import type { ProviderAdapter, RawCourseData } from "./provider-adapter";

/**
 * Raw response shape from Microsoft Learn catalog API.
 * See: https://learn.microsoft.com/en-us/training/browse/?terms=ai
 */
interface MicrosoftRawCourse {
  uid: string;
  title: string;
  summary: string;
  duration_in_minutes: number;
  levels: string[];
  products: string[];
  roles: string[];
  icon_url: string;
  url: string;
}

export class MicrosoftAdapter implements ProviderAdapter {
  async fetch(): Promise<RawCourseData[]> {
    // TODO: Replace with real Microsoft Learn Catalog API call
    // GET https://learn.microsoft.com/api/catalog?type=modules&terms=ai
    const mockCourses: MicrosoftRawCourse[] = [
      {
        uid: "ms-ai-fundamentals",
        title: "Azure AI Fundamentals",
        summary:
          "Learn the core concepts of artificial intelligence and how to implement AI solutions using Azure AI services.",
        duration_in_minutes: 360,
        levels: ["beginner"],
        products: ["azure", "azure-cognitive-services"],
        roles: ["ai-engineer", "data-scientist"],
        icon_url: "https://learn.microsoft.com/images/azure-ai-fundamentals.jpg",
        url: "https://learn.microsoft.com/training/paths/azure-ai-fundamentals",
      },
      {
        uid: "ms-copilot-foundations",
        title: "Microsoft Copilot Foundations",
        summary:
          "Understand how Microsoft Copilot works, its capabilities, and how to use AI-powered productivity tools effectively.",
        duration_in_minutes: 180,
        levels: ["beginner"],
        products: ["microsoft-365", "copilot"],
        roles: ["business-user", "developer"],
        icon_url: "https://learn.microsoft.com/images/copilot-foundations.jpg",
        url: "https://learn.microsoft.com/training/paths/copilot-foundations",
      },
      {
        uid: "ms-prompt-engineering",
        title: "Prompt Engineering with Azure OpenAI Service",
        summary:
          "Master prompt engineering techniques to get the best results from large language models using Azure OpenAI Service.",
        duration_in_minutes: 240,
        levels: ["intermediate"],
        products: ["azure", "azure-openai"],
        roles: ["ai-engineer", "developer"],
        icon_url:
          "https://learn.microsoft.com/images/prompt-engineering.jpg",
        url: "https://learn.microsoft.com/training/paths/prompt-engineering-azure-openai",
      },
    ];

    return mockCourses.map((course) => ({
      provider: "microsoft",
      rawPayload: course,
    }));
  }

  normalize(raw: RawCourseData): NormalizedCourse {
    const course = raw.rawPayload as MicrosoftRawCourse;

    return {
      id: `microsoft-${course.uid}`,
      externalId: course.uid,
      title: course.title,
      provider: "microsoft",
      description: course.summary,
      url: course.url,
      duration: this.formatDuration(course.duration_in_minutes),
      difficultyLevel: this.mapDifficulty(course.levels),
      topics: [...course.products, ...course.roles],
      thumbnailUrl: course.icon_url,
      isFree: true,
      lastVerified: new Date(),
    };
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.round(minutes / 60);
    return `${hours} hours`;
  }

  private mapDifficulty(
    levels: string[]
  ): "beginner" | "intermediate" | "advanced" {
    const primary = levels[0]?.toLowerCase() ?? "beginner";
    if (primary === "intermediate") return "intermediate";
    if (primary === "advanced") return "advanced";
    return "beginner";
  }
}
