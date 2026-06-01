import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthenticationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const history = attempts.map((attempt) => ({
    id: attempt.id,
    responses: JSON.parse(attempt.responses),
    categoryScores: JSON.parse(attempt.categoryScores),
    totalScore: attempt.totalScore,
    maturityLevel: attempt.maturityLevel,
    createdAt: attempt.createdAt,
  }));

  return NextResponse.json({ attempts: history });
});
