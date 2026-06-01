import {
  MaturityLevel,
  QuizCategory,
  QuizQuestion,
  QuizResponse,
  QuizResult,
} from "../types";

const ALL_CATEGORIES: QuizCategory[] = [
  "ai_literacy",
  "tool_proficiency",
  "prompt_engineering",
  "ethics",
  "domain_application",
];

export interface ScoringConfig {
  categoryWeights: Record<QuizCategory, number>;
  levelThresholds: {
    beginner: { min: number; max: number };
    intermediate: { min: number; max: number };
    advanced: { min: number; max: number };
    expert: { min: number; max: number };
  };
}

const DEFAULT_CONFIG: ScoringConfig = {
  categoryWeights: {
    ai_literacy: 1,
    tool_proficiency: 1,
    prompt_engineering: 1,
    ethics: 1,
    domain_application: 1,
  },
  levelThresholds: {
    beginner: { min: 0, max: 25 },
    intermediate: { min: 26, max: 50 },
    advanced: { min: 51, max: 75 },
    expert: { min: 76, max: 100 },
  },
};

export class ScoringModel {
  private config: ScoringConfig;

  constructor(config: ScoringConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Calculates the quiz result from responses and questions.
   * Produces category scores (0-100 each), a weighted total (0-100), and a maturity level.
   */
  calculate(responses: QuizResponse[], questions: QuizQuestion[]): QuizResult {
    const categoryScores = this.calculateCategoryScores(responses, questions);
    const totalScore = this.calculateWeightedTotal(categoryScores);
    const maturityLevel = this.mapToLevel(totalScore);
    return { categoryScores, totalScore, maturityLevel };
  }

  /**
   * Groups questions by category, sums the scores from selected options,
   * and normalizes each category score to 0-100.
   */
  private calculateCategoryScores(
    responses: QuizResponse[],
    questions: QuizQuestion[]
  ): Record<QuizCategory, number> {
    const questionMap = new Map<string, QuizQuestion>();
    for (const q of questions) {
      questionMap.set(q.id, q);
    }

    // Initialize accumulators per category
    const earned: Record<QuizCategory, number> = {
      ai_literacy: 0,
      tool_proficiency: 0,
      prompt_engineering: 0,
      ethics: 0,
      domain_application: 0,
    };
    const maxPossible: Record<QuizCategory, number> = {
      ai_literacy: 0,
      tool_proficiency: 0,
      prompt_engineering: 0,
      ethics: 0,
      domain_application: 0,
    };

    for (const response of responses) {
      const question = questionMap.get(response.questionId);
      if (!question) continue;

      const category = question.category;
      const selectedOption = question.options.find(
        (opt) => opt.id === response.selectedOptionId
      );
      const maxOptionScore = Math.max(...question.options.map((opt) => opt.score));

      // Weight the score by the question's weight
      const earnedScore = (selectedOption?.score ?? 0) * question.weight;
      const maxScore = maxOptionScore * question.weight;

      earned[category] += earnedScore;
      maxPossible[category] += maxScore;
    }

    // Normalize each category to 0-100
    const categoryScores = {} as Record<QuizCategory, number>;
    for (const category of ALL_CATEGORIES) {
      if (maxPossible[category] === 0) {
        categoryScores[category] = 0;
      } else {
        categoryScores[category] = Math.round(
          (earned[category] / maxPossible[category]) * 100
        );
      }
    }

    return categoryScores;
  }

  /**
   * Applies category weights to produce a final weighted total score (0-100).
   */
  private calculateWeightedTotal(
    categoryScores: Record<QuizCategory, number>
  ): number {
    const { categoryWeights } = this.config;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const category of ALL_CATEGORIES) {
      const weight = categoryWeights[category];
      weightedSum += categoryScores[category] * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) return 0;
    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Maps a total score (0-100) to a maturity level based on configured thresholds.
   */
  mapToLevel(score: number): MaturityLevel {
    const { levelThresholds } = this.config;
    if (score <= levelThresholds.beginner.max) return "beginner";
    if (score <= levelThresholds.intermediate.max) return "intermediate";
    if (score <= levelThresholds.advanced.max) return "advanced";
    return "expert";
  }
}

// Export a singleton instance with default config
export const scoringModel = new ScoringModel();
