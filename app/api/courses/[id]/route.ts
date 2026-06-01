import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { AuthenticationError, NotFoundError } from "@/lib/errors";

export const GET = withErrorHandling(
  async (request: Request, context: unknown) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!course) {
      throw new NotFoundError("Course");
    }

    // Parse topics JSON string back to array
    const normalizedCourse = {
      ...course,
      topics: JSON.parse(course.topics),
    };

    return NextResponse.json(normalizedCourse);
  }
);
