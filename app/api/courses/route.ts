import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { AuthenticationError } from "@/lib/errors";

export const GET = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const { searchParams } = new URL(request.url);

  const provider = searchParams.get("provider");
  const difficulty = searchParams.get("difficulty");
  const topic = searchParams.get("topic");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(searchParams.get("pageSize") ?? "12", 10) || 12)
  );

  // Build dynamic where clause
  const where: Record<string, unknown> = {};

  if (provider) {
    where.provider = provider;
  }

  if (difficulty) {
    where.difficultyLevel = difficulty;
  }

  if (topic) {
    // topics is stored as a JSON string in SQLite, use contains
    where.topics = { contains: topic };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.count({ where }),
  ]);

  // Parse topics JSON string back to array for each course
  const normalizedCourses = courses.map((course) => ({
    ...course,
    topics: JSON.parse(course.topics),
  }));

  return NextResponse.json({
    courses: normalizedCourses,
    total,
    page,
    pageSize,
  });
});
