import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthenticationError } from "@/lib/errors";
import { quizEngine } from "@/lib/services/quiz-engine";

export const POST = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const questions = quizEngine.generateQuiz();

  // Generate a unique quiz ID for this instance
  const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return NextResponse.json({
    quizId,
    questions: questions.map((q) => ({
      id: q.id,
      category: q.category,
      text: q.text,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
      })),
    })),
    totalQuestions: questions.length,
  });
});
