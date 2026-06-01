import type { NormalizedCourse } from "@/lib/types";
import type { ProviderAdapter, RawCourseData } from "./provider-adapter";

/**
 * Raw response shape from edX's course discovery API.
 * See: https://courses.edx.org/api/courses/v1/courses/
 */
interface EdxRawCourse {
  key: string;
  title: string;
  short_description: string;
  full_description: string;
  image: { src: string };
  effort: string;
  level_type: string;
  subjects: { name: string }[];
  marketing_url: string;
}

export class EdxAdapter implements ProviderAdapter {
  async fetch(): Promise<RawCourseData[]> {
    // TODO: Replace with real edX API call
    // GET https://courses.edx.org/api/courses/v1/courses/?search_term=artificial+intelligence
    const mockCourses: EdxRawCourse[] = [
      {
        key: "edx-cs50ai",
        title: "CS50's Introduction to Artificial Intelligence with Python",
        short_description:
          "Learn to use machine learning in Python in this introductory course on artificial intelligence.",
        full_description:
          "This course explores the concepts and algorithms at the foundation of modern artificial intelligence, diving into the ideas that give rise to technologies like game-playing engines, handwriting recognition, and machine translation.",
        image: { src: "https://edx.org/images/cs50ai.jpg" },
        effort: "70 hours",
        level_type: "Introductory",
        subjects: [
          { name: "artificial-intelligence" },
          { name: "python-programming" },
        ],
        marketing_url: "https://www.edx.org/course/cs50s-introduction-to-ai",
      },
      {
        key: "edx-nlp-001",
        title: "Natural Language Processing with Transformers",
        short_description:
          "Master NLP techniques using transformer architectures and modern deep learning approaches.",
        full_description:
          "Dive deep into natural language processing using state-of-the-art transformer models. Learn about attention mechanisms, BERT, GPT, and practical applications.",
        image: { src: "https://edx.org/images/nlp-transformers.jpg" },
        effort: "50 hours",
        level_type: "Advanced",
        subjects: [
          { name: "natural-language-processing" },
          { name: "deep-learning" },
        ],
        marketing_url:
          "https://www.edx.org/course/nlp-with-transformers",
      },
      {
        key: "edx-responsible-ai",
        title: "Responsible AI: Principles and Practical Applications",
        short_description:
          "Learn how to develop and deploy AI systems responsibly with a focus on fairness and transparency.",
        full_description:
          "Understand the principles of responsible AI development including fairness, accountability, transparency, and ethics. Apply these principles to real-world AI systems.",
        image: { src: "https://edx.org/images/responsible-ai.jpg" },
        effort: "25 hours",
        level_type: "Intermediate",
        subjects: [{ name: "ai-ethics" }, { name: "responsible-ai" }],
        marketing_url: "https://www.edx.org/course/responsible-ai",
      },
    ];

    return mockCourses.map((course) => ({
      provider: "edx",
      rawPayload: course,
    }));
  }

  normalize(raw: RawCourseData): NormalizedCourse {
    const course = raw.rawPayload as EdxRawCourse;

    return {
      id: `edx-${course.key}`,
      externalId: course.key,
      title: course.title,
      provider: "edx",
      description: course.short_description,
      url: course.marketing_url,
      duration: course.effort,
      difficultyLevel: this.mapDifficulty(course.level_type),
      topics: course.subjects.map((s) => s.name),
      thumbnailUrl: course.image.src,
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
