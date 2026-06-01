import { prisma } from "@/lib/prisma";
import type { CourseProgress } from "@/lib/types";

/**
 * ProgressTracker service handles course progress calculation and persistence.
 * Manages section completion state and computes completion percentages.
 */
export class ProgressTracker {
  /**
   * Calculate completion percentage from a list of sections.
   * Pure function: round(M / N * 100) where M = completed, N = total.
   * Returns 0 for empty sections array.
   */
  calculateCompletion(sections: { completed: boolean }[]): number {
    if (sections.length === 0) return 0;
    const completed = sections.filter((s) => s.completed).length;
    return Math.round((completed / sections.length) * 100);
  }

  /**
   * Mark a section as complete for a user's course progress.
   * 1. Get or create CourseProgress record
   * 2. Get all sections for the course
   * 3. Add sectionId to completedSections (if not already there)
   * 4. Recalculate completion percentage
   * 5. Persist to database
   * 6. Return updated progress state
   */
  async markSectionComplete(
    userId: string,
    courseId: string,
    sectionId: string
  ): Promise<CourseProgress> {
    // Get or create the progress record
    let progressRecord = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!progressRecord) {
      progressRecord = await prisma.courseProgress.create({
        data: {
          userId,
          courseId,
          completedSections: "[]",
          completionPercentage: 0,
        },
      });
    }

    // Parse completed sections from JSON string
    const completedSections: string[] = JSON.parse(
      progressRecord.completedSections
    );

    // Add sectionId if not already present
    if (!completedSections.includes(sectionId)) {
      completedSections.push(sectionId);
    }

    // Get all sections for the course to calculate percentage
    const allSections = await prisma.courseSection.findMany({
      where: { courseId },
    });

    // Build sections array for calculation
    const sectionsState = allSections.map((section) => ({
      sectionId: section.id,
      completed: completedSections.includes(section.id),
    }));

    // Recalculate completion percentage
    const completionPercentage = this.calculateCompletion(
      sectionsState.map((s) => ({ completed: s.completed }))
    );

    // Persist to database
    const updated = await prisma.courseProgress.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        completedSections: JSON.stringify(completedSections),
        completionPercentage,
      },
    });

    return {
      userId: updated.userId,
      courseId: updated.courseId,
      sections: sectionsState,
      completionPercentage: updated.completionPercentage,
      lastInteraction: updated.lastInteraction,
    };
  }

  /**
   * Mark a section as incomplete (toggle off).
   * Removes the sectionId from completedSections and recalculates.
   */
  async markSectionIncomplete(
    userId: string,
    courseId: string,
    sectionId: string
  ): Promise<CourseProgress> {
    // Get the progress record
    let progressRecord = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!progressRecord) {
      progressRecord = await prisma.courseProgress.create({
        data: {
          userId,
          courseId,
          completedSections: "[]",
          completionPercentage: 0,
        },
      });
    }

    // Parse completed sections from JSON string
    const completedSections: string[] = JSON.parse(
      progressRecord.completedSections
    );

    // Remove sectionId if present
    const updatedSections = completedSections.filter((id) => id !== sectionId);

    // Get all sections for the course
    const allSections = await prisma.courseSection.findMany({
      where: { courseId },
    });

    // Build sections array for calculation
    const sectionsState = allSections.map((section) => ({
      sectionId: section.id,
      completed: updatedSections.includes(section.id),
    }));

    // Recalculate completion percentage
    const completionPercentage = this.calculateCompletion(
      sectionsState.map((s) => ({ completed: s.completed }))
    );

    // Persist to database
    const updated = await prisma.courseProgress.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        completedSections: JSON.stringify(updatedSections),
        completionPercentage,
      },
    });

    return {
      userId: updated.userId,
      courseId: updated.courseId,
      sections: sectionsState,
      completionPercentage: updated.completionPercentage,
      lastInteraction: updated.lastInteraction,
    };
  }

  /**
   * Get current progress for a user/course combination.
   * Returns null if no progress record exists.
   */
  async getProgress(
    userId: string,
    courseId: string
  ): Promise<CourseProgress | null> {
    const progressRecord = await prisma.courseProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!progressRecord) {
      return null;
    }

    // Parse completed sections
    const completedSections: string[] = JSON.parse(
      progressRecord.completedSections
    );

    // Get all sections for the course
    const allSections = await prisma.courseSection.findMany({
      where: { courseId },
    });

    // Build sections array
    const sectionsState = allSections.map((section) => ({
      sectionId: section.id,
      completed: completedSections.includes(section.id),
    }));

    return {
      userId: progressRecord.userId,
      courseId: progressRecord.courseId,
      sections: sectionsState,
      completionPercentage: progressRecord.completionPercentage,
      lastInteraction: progressRecord.lastInteraction,
    };
  }
}

// Export singleton instance
export const progressTracker = new ProgressTracker();
