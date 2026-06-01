import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import { scoringModel } from "@/lib/services/scoring-model";
import { recommendationEngine } from "@/lib/services/recommendation-engine";
import { prisma } from "@/lib/prisma";
import { quizQuestionBank } from "@/lib/data/quiz-questions";
import { QuizSubmitRequest, QuizSubmitResponse, NormalizedCourse } from "@/lib/types";

export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const body = (await request.json()) as QuizSubmitRequest;

  // Validate request body
  if (!body.quizId || !body.responses || !Array.isArray(body.responses)) {
    throw new ValidationError({
      quizId: !body.quizId ? "quizId is required" : "",
      responses: !body.responses ? "responses array is required" : "",
    });
  }

  if (body.responses.length === 0) {
    throw new ValidationError({
      responses: "At least one response is required",
    });
  }

  // Calculate scores using the scoring model
  const quizResult = scoringModel.calculate(body.responses, quizQuestionBank);

  // Store the quiz attempt in the database
  await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      responses: JSON.stringify(body.responses),
      categoryScores: JSON.stringify(quizResult.categoryScores),
      totalScore: quizResult.totalScore,
      maturityLevel: quizResult.maturityLevel,
    },
  });

  // Fetch courses from the database for recommendations
  const coursesFromDb = await prisma.course.findMany({
    where: { isFree: true },
  });

  // Convert DB courses to NormalizedCourse format
  const catalog: NormalizedCourse[] = coursesFromDb.map((course) => ({
    id: course.id,
    externalId: course.externalId,
    title: course.title,
    provider: course.provider as NormalizedCourse["provider"],
    description: course.description,
    url: course.url,
    duration: course.duration,
    difficultyLevel: course.difficultyLevel as NormalizedCourse["difficultyLevel"],
    topics: JSON.parse(course.topics) as string[],
    thumbnailUrl: course.thumbnailUrl ?? "",
    isFree: course.isFree,
    lastVerified: course.lastVerified,
  }));

  // Generate recommendations based on quiz results
  const recommendations = recommendationEngine.generateRecommendations(
    quizResult,
    catalog
  );

  const response: QuizSubmitResponse = {
    totalScore: quizResult.totalScore,
    maturityLevel: quizResult.maturityLevel,
    categoryScores: quizResult.categoryScores,
    recommendations,
  };

  return NextResponse.json(response);
});
