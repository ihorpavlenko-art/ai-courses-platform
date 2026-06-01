import { QuizCategory, QuizQuestion } from "../types";
import { quizQuestionBank } from "../data/quiz-questions";

const ALL_CATEGORIES: QuizCategory[] = [
  "ai_literacy",
  "tool_proficiency",
  "prompt_engineering",
  "ethics",
  "domain_application",
];

const MIN_QUESTIONS_PER_CATEGORY = 3;
const MIN_TOTAL_QUESTIONS = 15;
const MAX_TOTAL_QUESTIONS = 20;

export class QuizEngine {
  private questionBank: QuizQuestion[];

  constructor(questionBank: QuizQuestion[] = quizQuestionBank) {
    this.questionBank = questionBank;
  }

  /**
   * Generates a quiz with 15-20 questions ensuring minimum 3 per category.
   * Questions are randomly selected and shuffled within each category.
   */
  generateQuiz(): QuizQuestion[] {
    const questionsByCategory = this.groupByCategory();
    const selected: QuizQuestion[] = [];

    // Step 1: Select minimum 3 questions from each category
    for (const category of ALL_CATEGORIES) {
      const categoryQuestions = questionsByCategory.get(category) || [];
      const shuffled = this.shuffle([...categoryQuestions]);
      const picked = shuffled.slice(0, MIN_QUESTIONS_PER_CATEGORY);
      selected.push(...picked);
    }

    // Step 2: Fill remaining slots (up to target total) from remaining questions
    const selectedIds = new Set(selected.map((q) => q.id));
    const remaining = this.questionBank.filter((q) => !selectedIds.has(q.id));
    const shuffledRemaining = this.shuffle([...remaining]);

    const targetTotal =
      MIN_TOTAL_QUESTIONS +
      Math.floor(
        Math.random() * (MAX_TOTAL_QUESTIONS - MIN_TOTAL_QUESTIONS + 1)
      );
    const slotsToFill = targetTotal - selected.length;

    if (slotsToFill > 0) {
      selected.push(...shuffledRemaining.slice(0, slotsToFill));
    }

    // Step 3: Shuffle the final selection
    return this.shuffle(selected);
  }

  private groupByCategory(): Map<QuizCategory, QuizQuestion[]> {
    const map = new Map<QuizCategory, QuizQuestion[]>();
    for (const category of ALL_CATEGORIES) {
      map.set(category, []);
    }
    for (const question of this.questionBank) {
      const list = map.get(question.category);
      if (list) {
        list.push(question);
      }
    }
    return map;
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// Export a singleton instance
export const quizEngine = new QuizEngine();
