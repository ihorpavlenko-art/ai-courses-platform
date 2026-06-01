// Structured error classes for the AI Courses Platform

export class AppError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super("AUTH_REQUIRED", message, 401);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string>) {
    super("VALIDATION_ERROR", "Invalid request data", 400, details);
    this.name = "ValidationError";
  }
}

export class AggregationError extends AppError {
  constructor(provider: string, cause: Error) {
    super("AGGREGATION_FAILED", `Failed to fetch from ${provider}`, 502, {
      provider,
      cause: cause.message,
    });
    this.name = "AggregationError";
  }
}
