import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { AuthenticationError } from "@/lib/errors";
import { recommendationEngine } from "@/lib/services/recommendation-engine";
import type { NormalizedCourse, CourseProvider, DifficultyLevel, QuizResult } from "@/lib/types";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  // Get the most recent quiz attempt for the user
  const latestAttempt = await prisma.quizAttempt.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!latestAttempt) {
    return NextResponse.json({ recommendations: [] });
  }

  // Build the QuizResult from the stored attempt
  const quizResult: QuizResult = {
    categoryScores: JSON.parse(latestAttempt.categoryScores),
    totalScore: latestAttempt.totalScore,
    maturityLevel: latestAttempt.maturityLevel as QuizResult["maturityLevel"],
  };

  // Fetch all courses from the database
  const courses = await prisma.course.findMany();

  // Convert to NormalizedCourse format
  const catalog: NormalizedCourse[] = courses.map((course) => ({
    id: course.id,
    externalId: course.externalId,
    title: course.title,
    provider: course.provider as CourseProvider,
    description: course.description,
    url: course.url,
    duration: course.duration,
    difficultyLevel: course.difficultyLevel as DifficultyLevel,
    topics: JSON.parse(course.topics),
    thumbnailUrl: course.thumbnailUrl ?? "",
    isFree: course.isFree,
    lastVerified: course.lastVerified,
  }));

  const recommendations = recommendationEngine.generateRecommendations(quizResult, catalog);

  return NextResponse.json({ recommendations });
});
