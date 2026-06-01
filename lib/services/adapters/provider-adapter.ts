// Provider adapter interface — placeholder for Task 3.1
import type { NormalizedCourse } from "@/lib/types";

export interface RawCourseData {
  provider: string;
  rawPayload: unknown;
}

export interface ProviderAdapter {
  fetch(): Promise<RawCourseData[]>;
  normalize(raw: RawCourseData): NormalizedCourse;
}
