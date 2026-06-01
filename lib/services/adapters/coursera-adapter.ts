import type { NormalizedCourse } from "@/lib/types";
import type { ProviderAdapter, RawCourseData } from "./provider-adapter";

/**
 * Raw response shape from Coursera's catalog API.
 * See: https://build.coursera.org/app-platform/catalog/
 */
interface CourseraRawCourse {
  id: string;
  slug: string;
  name: string;
  description: string;
  photoUrl: string;
  workload: string;
  level: string;
  domainTypes: { domainId: string; subdomainId: string }[];
  partnerIds: string[];
}

export class CourseraAdapter implements ProviderAdapter {
  async fetch(): Promise<RawCourseData[]> {
    // TODO: Replace with real Coursera API call
    // GET https://api.coursera.org/api/courses.v1?q=search&query=artificial+intelligence&fields=...
    const mockCourses: CourseraRawCourse[] = [
      {
        id: "coursera-ml-001",
        slug: "machine-learning",
        name: "Machine Learning",
        description:
          "Learn the fundamentals of machine learning including supervised and unsupervised learning, best practices, and real-world applications.",
        photoUrl: "https://coursera.org/images/ml-course.jpg",
        workload: "60 hours",
        level: "Beginner",
        domainTypes: [
          { domainId: "computer-science", subdomainId: "machine-learning" },
        ],
        partnerIds: ["stanford"],
      },
      {
        id: "coursera-dl-002",
        slug: "deep-learning-specialization",
        name: "Deep Learning Specialization",
        description:
          "Master deep learning fundamentals: neural networks, CNNs, RNNs, and build real-world AI applications.",
        photoUrl: "https://coursera.org/images/dl-spec.jpg",
        workload: "80 hours",
        level: "Intermediate",
        domainTypes: [
          { domainId: "computer-science", subdomainId: "deep-learning" },
        ],
        partnerIds: ["deeplearning-ai"],
      },
      {
        id: "coursera-ai-ethics-003",
        slug: "ai-ethics",
        name: "AI Ethics",
        description:
          "Explore the ethical implications of artificial intelligence including bias, fairness, transparency, and accountability.",
        photoUrl: "https://coursera.org/images/ai-ethics.jpg",
        workload: "20 hours",
        level: "Beginner",
        domainTypes: [
          { domainId: "computer-science", subdomainId: "ai-ethics" },
        ],
        partnerIds: ["university-of-helsinki"],
      },
    ];

    return mockCourses.map((course) => ({
      provider: "coursera",
      rawPayload: course,
    }));
  }

  normalize(raw: RawCourseData): NormalizedCourse {
    const course = raw.rawPayload as CourseraRawCourse;

    return {
      id: `coursera-${course.id}`,
      externalId: course.id,
      title: course.name,
      provider: "coursera",
      description: course.description,
      url: `https://www.coursera.org/learn/${course.slug}`,
      duration: course.workload,
      difficultyLevel: this.mapDifficulty(course.level),
      topics: course.domainTypes.map((d) => d.subdomainId),
      thumbnailUrl: course.photoUrl,
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
