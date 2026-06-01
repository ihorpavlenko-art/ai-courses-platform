import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { AuthenticationError } from "@/lib/errors";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const userId = session.user.id;

  // Get all course progress records for the user, including course sections
  const progressRecords = await prisma.courseProgress.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          sections: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  // Format the response with section completion states
  const progress = progressRecords.map((record) => {
    const completedSections: string[] = JSON.parse(record.completedSections);

    const sections = record.course.sections.map((section) => ({
      sectionId: section.id,
      completed: completedSections.includes(section.id),
    }));

    return {
      userId: record.userId,
      courseId: record.courseId,
      courseTitle: record.course.title,
      sections,
      completionPercentage: record.completionPercentage,
      lastInteraction: record.lastInteraction,
    };
  });

  return NextResponse.json(progress);
});
