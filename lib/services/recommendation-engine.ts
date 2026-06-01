import {
  DifficultyLevel,
  NormalizedCourse,
  QuizCategory,
  QuizResult,
} from "../types";

/**
 * Keyword mappings from course topics to quiz categories.
 * Used to determine which courses are relevant to a user's skill gaps.
 */
const TOPIC_CATEGORY_KEYWORDS: Record<QuizCategory, string[]> = {
  ai_literacy: [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "neural network",
    "ai fundamentals",
    "ai basics",
    "ai introduction",
    "natural language processing",
    "computer vision",
    "data science",
    "ai concepts",
    "supervised learning",
    "unsupervised learning",
    "reinforcement learning",
  ],
  tool_proficiency: [
    "chatgpt",
    "copilot",
    "midjourney",
    "dall-e",
    "stable diffusion",
    "ai tools",
    "automation",
    "tensorflow",
    "pytorch",
    "hugging face",
    "langchain",
    "openai api",
    "ai assistant",
    "ai productivity",
    "github copilot",
  ],
  prompt_engineering: [
    "prompt",
    "prompting",
    "prompt engineering",
    "prompt design",
    "chain of thought",
    "few-shot",
    "zero-shot",
    "instruction tuning",
    "prompt optimization",
    "llm interaction",
  ],
  ethics: [
    "ethics",
    "bias",
    "fairness",
    "responsible ai",
    "ai safety",
    "ai governance",
    "privacy",
    "transparency",
    "accountability",
    "ai regulation",
    "ai policy",
    "trustworthy ai",
  ],
  domain_application: [
    "healthcare ai",
    "finance ai",
    "marketing ai",
    "business ai",
    "ai strategy",
    "ai implementation",
    "industry ai",
    "applied ai",
    "ai use cases",
    "ai transformation",
    "enterprise ai",
    "ai adoption",
  ],
};

/**
 * Difficulty ranking used for sorting recommendations.
 * Lower values are prioritized for users with weaker scores.
 */
const DIFFICULTY_ORDER: Record<DifficultyLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export class RecommendationEngine {
  /**
   * Generates personalized course recommendations based on quiz results.
   * Identifies skill gaps (categories below 50), filters courses relevant
   * to those gaps, ranks by relevance, and returns the top 10.
   */
  generateRecommendations(
    quizResult: QuizResult,
    catalog: NormalizedCourse[]
  ): NormalizedCourse[] {
    const weakCategories = this.identifySkillGaps(quizResult);

    if (weakCategories.length === 0) {
      return [];
    }

    const matchingCourses = catalog.filter((course) =>
      course.topics.some((topic) => {
        const category = this.mapTopicToCategory(topic);
        return category !== null && weakCategories.includes(category);
      })
    );

    return this.rankByRelevance(matchingCourses, quizResult).slice(0, 10);
  }

  /**
   * Identifies skill gaps: categories where the user scored below 50.
   */
  identifySkillGaps(result: QuizResult): QuizCategory[] {
    return Object.entries(result.categoryScores)
      .filter(([_, score]) => score < 50)
      .map(([category]) => category as QuizCategory);
  }

  /**
   * Maps a course topic string to a quiz category using keyword matching.
   * Returns the category whose keywords best match the topic, or null if no match.
   */
  mapTopicToCategory(topic: string): QuizCategory | null {
    const normalizedTopic = topic.toLowerCase();

    for (const [category, keywords] of Object.entries(
      TOPIC_CATEGORY_KEYWORDS
    )) {
      for (const keyword of keywords) {
        if (normalizedTopic.includes(keyword) || keyword.includes(normalizedTopic)) {
          return category as QuizCategory;
        }
      }
    }

    return null;
  }

  /**
   * Ranks courses by relevance to the user's weak categories.
   * Primary sort: number of weak categories the course covers (descending).
   * Secondary sort: difficulty level — beginner courses first for weaker overall scores.
   */
  private rankByRelevance(
    courses: NormalizedCourse[],
    quizResult: QuizResult
  ): NormalizedCourse[] {
    const weakCategories = this.identifySkillGaps(quizResult);

    return [...courses].sort((a, b) => {
      // Primary: count of weak categories covered (more = better)
      const aRelevance = this.countWeakCategoriesCovered(a, weakCategories);
      const bRelevance = this.countWeakCategoriesCovered(b, weakCategories);

      if (bRelevance !== aRelevance) {
        return bRelevance - aRelevance;
      }

      // Secondary: difficulty (beginner first for weaker scores)
      const aDifficulty = DIFFICULTY_ORDER[a.difficultyLevel];
      const bDifficulty = DIFFICULTY_ORDER[b.difficultyLevel];

      return aDifficulty - bDifficulty;
    });
  }

  /**
   * Counts how many weak categories a course's topics cover.
   */
  private countWeakCategoriesCovered(
    course: NormalizedCourse,
    weakCategories: QuizCategory[]
  ): number {
    const coveredCategories = new Set<QuizCategory>();

    for (const topic of course.topics) {
      const category = this.mapTopicToCategory(topic);
      if (category && weakCategories.includes(category)) {
        coveredCategories.add(category);
      }
    }

    return coveredCategories.size;
  }
}

// Export a singleton instance
export const recommendationEngine = new RecommendationEngine();
