import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { progressTracker } from "@/lib/services/progress-tracker";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import type { ProgressUpdateResponse } from "@/lib/types";

export const PUT = withErrorHandling(
  async (request: Request, context: unknown) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    // In Next.js 15+, params is a Promise
    const params = (context as { params: Promise<{ courseId: string }> }).params;
    const { courseId } = await params;

    const body = await request.json();

    // Validate request body
    const errors: Record<string, string> = {};
    if (!body.sectionId || typeof body.sectionId !== "string") {
      errors.sectionId = "sectionId is required and must be a string";
    }
    if (typeof body.completed !== "boolean") {
      errors.completed = "completed is required and must be a boolean";
    }
    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    const userId = session.user.id;
    const { sectionId, completed } = body;

    // Call the appropriate progress tracker method
    const updatedProgress = completed
      ? await progressTracker.markSectionComplete(userId, courseId, sectionId)
      : await progressTracker.markSectionIncomplete(userId, courseId, sectionId);

    const response: ProgressUpdateResponse = {
      completionPercentage: updatedProgress.completionPercentage,
      sections: updatedProgress.sections,
    };

    return NextResponse.json(response);
  }
);
