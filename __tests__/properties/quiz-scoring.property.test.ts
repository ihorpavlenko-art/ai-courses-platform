import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { QuizEngine } from "@/lib/services/quiz-engine";
import { ScoringModel } from "@/lib/services/scoring-model";
import { RecommendationEngine } from "@/lib/services/recommendation-engine";
import {
  QuizCategory,
  QuizQuestion,
  QuizResponse,
  QuizResult,
  NormalizedCourse,
  CourseProvider,
  DifficultyLevel,
} from "@/lib/types";

/**
 * Property-Based Tests for Quiz Engine, Scoring Model, and Recommendation Engine
 *
 * **Validates: Requirements 5.1, 5.4, 5.5, 5.7**
 */

// --- Constants ---

const ALL_CATEGORIES: QuizCategory[] = [
  "ai_literacy",
  "tool_proficiency",
  "prompt_engineering",
  "ethics",
  "domain_application",
];

// Topic keywords that map to each category (from recommendation-engine.ts)
const CATEGORY_TOPIC_EXAMPLES: Record<QuizCategory, string[]> = {
  ai_literacy: ["machine learning", "deep learning", "neural network", "ai fundamentals"],
  tool_proficiency: ["chatgpt", "copilot", "ai tools", "github copilot"],
  prompt_engineering: ["prompt engineering", "prompt design", "chain of thought"],
  ethics: ["ai ethics", "bias", "responsible ai", "ai safety"],
  domain_application: ["healthcare ai", "finance ai", "business ai", "ai strategy"],
};

// --- Generators ---

/** Generate a random quiz response for a given question (picks a random option) */
function quizResponseArb(question: QuizQuestion): fc.Arbitrary<QuizResponse> {
  return fc.integer({ min: 0, max: question.options.length - 1 }).map((idx) => ({
    questionId: question.id,
    selectedOptionId: question.options[idx].id,
  }));
}

/** Generate a random category score between 0 and 100 */
const categoryScoreArb = fc.integer({ min: 0, max: 100 });

/** Generate a QuizResult with specified weak categories (score < 50) */
function quizResultWithWeakCategoriesArb(
  weakCategories: QuizCategory[]
): fc.Arbitrary<QuizResult> {
  return fc
    .record({
      ai_literacy: weakCategories.includes("ai_literacy")
        ? fc.integer({ min: 0, max: 49 })
        : fc.integer({ min: 50, max: 100 }),
      tool_proficiency: weakCategories.includes("tool_proficiency")
        ? fc.integer({ min: 0, max: 49 })
        : fc.integer({ min: 50, max: 100 }),
      prompt_engineering: weakCategories.includes("prompt_engineering")
        ? fc.integer({ min: 0, max: 49 })
        : fc.integer({ min: 50, max: 100 }),
      ethics: weakCategories.includes("ethics")
        ? fc.integer({ min: 0, max: 49 })
        : fc.integer({ min: 50, max: 100 }),
      domain_application: weakCategories.includes("domain_application")
        ? fc.integer({ min: 0, max: 49 })
        : fc.integer({ min: 50, max: 100 }),
    })
    .map((scores) => {
      const categoryScores = scores as Record<QuizCategory, number>;
      const totalScore = Math.round(
        Object.values(categoryScores).reduce((a, b) => a + b, 0) / 5
      );
      const maturityLevel =
        totalScore <= 25
          ? "beginner"
          : totalScore <= 50
          ? "intermediate"
          : totalScore <= 75
          ? "advanced"
          : "expert";
      return {
        categoryScores,
        totalScore,
        maturityLevel,
      } as QuizResult;
    });
}

/** Generate a subset of weak categories (at least 1) */
const weakCategoriesArb = fc
  .subarray(ALL_CATEGORIES, { minLength: 1, maxLength: 5 })
  .filter((arr) => arr.length >= 1);

/** Generate a course with topics that map to specific categories */
function courseWithTopicsArb(
  categories: QuizCategory[]
): fc.Arbitrary<NormalizedCourse> {
  // Pick one topic from each specified category
  const topicArbs = categories.map((cat) =>
    fc.constantFrom(...CATEGORY_TOPIC_EXAMPLES[cat])
  );

  return fc
    .tuple(
      fc.uuid(),
      fc.string({ minLength: 5, maxLength: 50 }),
      fc.constantFrom<CourseProvider>(
        "coursera",
        "edx",
        "google",
        "microsoft",
        "deeplearning_ai"
      ),
      fc.constantFrom<DifficultyLevel>("beginner", "intermediate", "advanced"),
      ...topicArbs
    )
    .map(([id, title, provider, difficulty, ...topics]) => ({
      id,
      externalId: `ext-${id}`,
      title: `Course: ${title}`,
      provider,
      description: `A course about ${topics.join(", ")}`,
      url: `https://example.com/courses/${id}`,
      duration: "4 weeks",
      difficultyLevel: difficulty,
      topics: topics as string[],
      thumbnailUrl: `https://example.com/thumb/${id}.jpg`,
      isFree: true,
      lastVerified: new Date(),
    }));
}

/** Generate a course with topics that do NOT map to any category */
const unmappedCourseArb: fc.Arbitrary<NormalizedCourse> = fc
  .tuple(
    fc.uuid(),
    fc.string({ minLength: 5, maxLength: 50 }),
    fc.constantFrom<CourseProvider>(
      "coursera",
      "edx",
      "google",
      "microsoft",
      "deeplearning_ai"
    ),
    fc.constantFrom<DifficultyLevel>("beginner", "intermediate", "advanced")
  )
  .map(([id, title, provider, difficulty]) => ({
    id,
    externalId: `ext-${id}`,
    title: `Unrelated: ${title}`,
    provider,
    description: "A course about cooking and gardening",
    url: `https://example.com/courses/${id}`,
    duration: "2 weeks",
    difficultyLevel: difficulty,
    topics: ["cooking basics", "gardening tips", "home improvement"],
    thumbnailUrl: `https://example.com/thumb/${id}.jpg`,
    isFree: true,
    lastVerified: new Date(),
  }));

// --- Property 8: Quiz Generation Validity ---

describe("Property 8: Quiz Generation Validity", () => {
  const quizEngine = new QuizEngine();

  /**
   * **Validates: Requirements 5.1**
   *
   * For any generated quiz instance, the quiz SHALL contain between 15 and 20
   * questions (inclusive), and SHALL include at least 3 questions from each of
   * the 5 categories.
   */
  it("generated quiz contains 15-20 questions with at least 3 per category", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (_seed) => {
        const quiz = quizEngine.generateQuiz();

        // Assert: quiz length is between 15 and 20 (inclusive)
        expect(quiz.length).toBeGreaterThanOrEqual(15);
        expect(quiz.length).toBeLessThanOrEqual(20);

        // Assert: at least 3 questions from each of the 5 categories
        for (const category of ALL_CATEGORIES) {
          const categoryCount = quiz.filter(
            (q) => q.category === category
          ).length;
          expect(categoryCount).toBeGreaterThanOrEqual(3);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 9: Scoring Model Correctness ---

describe("Property 9: Scoring Model Correctness", () => {
  const quizEngine = new QuizEngine();
  const scoringModel = new ScoringModel();

  /**
   * **Validates: Requirements 5.4, 5.5**
   *
   * For any valid set of quiz responses, the Scoring Model SHALL produce:
   * - a total score between 0 and 100 (inclusive)
   * - category scores between 0 and 100 for each category
   * - a maturity level that correctly corresponds to score thresholds
   */
  it("produces valid scores and correct maturity level mapping for random responses", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (_seed) => {
        // Generate a quiz
        const quiz = quizEngine.generateQuiz();

        // Generate random responses for each question
        const responses: QuizResponse[] = quiz.map((question) => {
          const randomIdx = Math.floor(
            Math.random() * question.options.length
          );
          return {
            questionId: question.id,
            selectedOptionId: question.options[randomIdx].id,
          };
        });

        // Calculate the result
        const result = scoringModel.calculate(responses, quiz);

        // Assert: totalScore is between 0 and 100 (inclusive)
        expect(result.totalScore).toBeGreaterThanOrEqual(0);
        expect(result.totalScore).toBeLessThanOrEqual(100);

        // Assert: each categoryScore is between 0 and 100
        for (const category of ALL_CATEGORIES) {
          expect(result.categoryScores[category]).toBeGreaterThanOrEqual(0);
          expect(result.categoryScores[category]).toBeLessThanOrEqual(100);
        }

        // Assert: maturityLevel correctly maps to score thresholds
        const score = result.totalScore;
        if (score <= 25) {
          expect(result.maturityLevel).toBe("beginner");
        } else if (score <= 50) {
          expect(result.maturityLevel).toBe("intermediate");
        } else if (score <= 75) {
          expect(result.maturityLevel).toBe("advanced");
        } else {
          expect(result.maturityLevel).toBe("expert");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("all-correct responses produce maximum scores", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (_seed) => {
        const quiz = quizEngine.generateQuiz();

        // Select the highest-scoring option for each question
        const responses: QuizResponse[] = quiz.map((question) => {
          const bestOption = question.options.reduce((best, opt) =>
            opt.score > best.score ? opt : best
          );
          return {
            questionId: question.id,
            selectedOptionId: bestOption.id,
          };
        });

        const result = scoringModel.calculate(responses, quiz);

        // All category scores should be 100 when all answers are max
        for (const category of ALL_CATEGORIES) {
          expect(result.categoryScores[category]).toBe(100);
        }
        expect(result.totalScore).toBe(100);
        expect(result.maturityLevel).toBe("expert");
      }),
      { numRuns: 100 }
    );
  });

  it("all-zero responses produce minimum scores", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (_seed) => {
        const quiz = quizEngine.generateQuiz();

        // Select the lowest-scoring option (score = 0) for each question
        const responses: QuizResponse[] = quiz.map((question) => {
          const worstOption = question.options.reduce((worst, opt) =>
            opt.score < worst.score ? opt : worst
          );
          return {
            questionId: question.id,
            selectedOptionId: worstOption.id,
          };
        });

        const result = scoringModel.calculate(responses, quiz);

        // Total score should be 0 when all answers score 0
        expect(result.totalScore).toBe(0);
        expect(result.maturityLevel).toBe("beginner");
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 10: Recommendation Relevance ---

describe("Property 10: Recommendation Relevance", () => {
  const recommendationEngine = new RecommendationEngine();

  /**
   * **Validates: Requirements 5.7**
   *
   * For any quiz result with identified skill gaps (categories scoring below 50),
   * every recommended course SHALL have at least one topic that maps to one of
   * the identified weak categories. At most 10 recommendations returned.
   */
  it("every recommended course maps to an identified weak category", () => {
    fc.assert(
      fc.property(
        weakCategoriesArb.chain((weakCats) =>
          fc.tuple(
            fc.constant(weakCats),
            quizResultWithWeakCategoriesArb(weakCats),
            // Generate a catalog with some relevant and some irrelevant courses
            fc.tuple(
              fc.array(courseWithTopicsArb(weakCats), { minLength: 1, maxLength: 10 }),
              fc.array(unmappedCourseArb, { minLength: 0, maxLength: 5 })
            )
          )
        ),
        ([weakCats, quizResult, [relevantCourses, irrelevantCourses]]) => {
          const catalog = [...relevantCourses, ...irrelevantCourses];

          const recommendations =
            recommendationEngine.generateRecommendations(quizResult, catalog);

          // Assert: at most 10 recommendations returned
          expect(recommendations.length).toBeLessThanOrEqual(10);

          // Assert: every recommended course has at least one topic mapping to a weak category
          for (const course of recommendations) {
            const hasRelevantTopic = course.topics.some((topic) => {
              const mappedCategory =
                recommendationEngine.mapTopicToCategory(topic);
              return mappedCategory !== null && weakCats.includes(mappedCategory);
            });
            expect(hasRelevantTopic).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns empty recommendations when no skill gaps exist", () => {
    fc.assert(
      fc.property(
        fc.array(unmappedCourseArb, { minLength: 1, maxLength: 10 }),
        (catalog) => {
          // Quiz result with all categories >= 50 (no weak categories)
          const quizResult: QuizResult = {
            categoryScores: {
              ai_literacy: 80,
              tool_proficiency: 75,
              prompt_engineering: 60,
              ethics: 90,
              domain_application: 55,
            },
            totalScore: 72,
            maturityLevel: "advanced",
          };

          const recommendations =
            recommendationEngine.generateRecommendations(quizResult, catalog);

          // No skill gaps → no recommendations
          expect(recommendations).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
